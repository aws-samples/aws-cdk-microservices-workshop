import cdk = require('@aws-cdk/core');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import ecr = require('@aws-cdk/aws-ecr');
import iam = require('@aws-cdk/aws-iam');
import logs = require('@aws-cdk/aws-logs');

export class EcsWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

	  const vpc = new ec2.Vpc(this, 'VPC');
    
    const colortellerSecGrp = new ec2.SecurityGroup(this, "colortellerSecurityGroup", {
      allowAllOutbound: true,
      securityGroupName: 'colortellerSecurityGroup',
      vpc: vpc
    });
    
    colortellerSecGrp.connections.allowFromAnyIpv4(ec2.Port.tcp(8080))
    
    const colorgatewaySecGrp = new ec2.SecurityGroup(this, "colorgatewaySecurityGroup", {
      allowAllOutbound: true,
      securityGroupName: 'colorgatewaySecurityGroup',
      vpc: vpc
    });
    
    colorgatewaySecGrp.connections.allowFromAnyIpv4(ec2.Port.tcp(8080))
    
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: vpc
    });
    
    cluster.addDefaultCloudMapNamespace({name: 'ecslab'})
    
    const taskrole = new iam.Role(this, 'ecsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
    });
    
    taskrole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'))

    const colortellerrepo = new ecr.Repository(this, 'colorteller', {repositoryName:'colorteller'});
    
    const colorgatewayrepo = new ecr.Repository(this, 'colorgateway', {repositoryName:'colorgateway'});
    
    const colortellerTaskDefinition = new ecs.FargateTaskDefinition(this, 'colortellerTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole: taskrole
    });
    
    const colorgatewayTaskDefinition = new ecs.FargateTaskDefinition(this, 'colorgatewayTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
      taskRole: taskrole
    });

    const colortellerLogGroup = new logs.LogGroup(this, "colortellerLogGroup", {
      logGroupName: "/ecs/colorteller",
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    const colorgatewayLogGroup = new logs.LogGroup(this, "colorgatewayLogGroup", {
      logGroupName: "/ecs/colorgateway",
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    
    const colortellerLogDriver = new ecs.AwsLogDriver({
        logGroup: colortellerLogGroup,
        streamPrefix: "colorteller"
      });
      
    const colorgatewayLogDriver = new ecs.AwsLogDriver({
        logGroup: colorgatewayLogGroup,
        streamPrefix: "colorgateway"
      });

    const colortellerContainer = colortellerTaskDefinition.addContainer("colortellerContainer", {
      image: ecs.ContainerImage.fromEcrRepository(colortellerrepo),
      environment: {
        'COLOR': 'blue'
      },
      logging: colortellerLogDriver
    });
    
    const colorgatewayContainer = colorgatewayTaskDefinition.addContainer("colorgatewayContainer", {
      image: ecs.ContainerImage.fromEcrRepository(colorgatewayrepo),
      environment: {
        'COLOR_TELLER_ENDPOINT': 'colorteller-service.ecslab:8080',
        'TCP_ECHO_ENDPOINT': 'colorteller-service.ecslab:8080'
      },
      logging: colorgatewayLogDriver
    });
    
    colortellerContainer.addPortMappings({
      containerPort: 8080
    });
    
    colorgatewayContainer.addPortMappings({
      containerPort: 8080
    });
    
    const colortellerService = new ecs.FargateService(this, 'colortellerService', { 
      cluster: cluster,
      taskDefinition: colortellerTaskDefinition,
      assignPublicIp: true,
      desiredCount: 2,
      securityGroup: colortellerSecGrp,
      cloudMapOptions: {
        name: 'colorteller-service'
      }
    });
    
    const colorgatewayService = new ecs.FargateService(this, 'colorgatewayService', { 
      cluster: cluster,
      taskDefinition: colorgatewayTaskDefinition,
      assignPublicIp: true,
      desiredCount: 2,
      securityGroup: colorgatewaySecGrp
    });
    
    const colorgatewayLB = new elbv2.ApplicationLoadBalancer(this, 'external', {
      vpc: vpc,
      internetFacing: true
    });
    
    const colorgatewayListener = colorgatewayLB.addListener('colorgatewayListener', {
      port: 80
    });
    
    
    const colorgatewayTargetGroup = colorgatewayListener.addTargets('colorgatewayTargetGroup', {
        port: 80,
        healthCheck:{
          "path": '/ping'
        },
        targets: [colorgatewayService],
    });

    new cdk.CfnOutput(this, 'ALBDNS: ', { value: colorgatewayLB.loadBalancerDnsName });

}
}