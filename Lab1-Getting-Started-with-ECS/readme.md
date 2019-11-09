

# Getting Started with ECS


## 1. Preparing CDK in Cloud9

Please bring up a Cloud9 instance by going to https://ap-southeast-1.console.aws.amazon.com/cloud9/home/product. Cloud9 will provide you terminal access to run AWS CLI.

First create the AWS CDK Toolkit. The toolkit is a command-line utility which allows you to work with CDK apps.

```
npm install -g aws-cdk@1.7.0

```

In the terminal of the Cloud9, run the following command to create an empty directory.

```
mkdir ecs-workshop && cd ecs-workshop

```

We will use cdk init to create a new TypeScript CDK project:

```
cdk init sample-app --language typescript

```

Open a new terminal session (or tab). You will keep this window open in the background for the duration of the workshop.

From your project directory run:

```
cd ecs-workshop

```

And:

```
npm run watch

```

This will start the TypeScript compiler (tsc) in “watch” mode, which will monitor your project directory and will automatically compile any changes to your .ts files to .js.

## 2. Create the ECS cluster and VPC.

Open up lib/ecs-workshop.ts. This is where the meat of our application is. The project created by cdk init sample-app includes an SQS queue, and an SNS topic. We’re not going to use them in our project, so remove them from your the CdkWorkshopStack constructor.

Open lib/ecs-workshop-stack.ts and clean it up. Eventually it should look like this:

```ts
import cdk = require('@aws-cdk/core');

export class EcsWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // nothing here!
  }
}
```

Install the EC2 construct library

```ts
npm install @aws-cdk/aws-ec2@1.7.0
npm install @aws-cdk/aws-elasticloadbalancingv2@1.7.0
npm install @aws-cdk/aws-ecs@1.7.0
npm install @aws-cdk/aws-ecr-assets@1.7.0
npm install @aws-cdk/aws-iam@1.7.0
npm install @aws-cdk/aws-logs@1.7.0

```

Add the import statements at the beginning of lib/ecs-workshop-stack.ts, and the code that creates the VPC and ECS cluster.

```ts
import cdk = require('@aws-cdk/core');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import { DockerImageAsset } = require('@aws-cdk/aws-ecr-assets');
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

}
}

```

Let’s deploy:

```
cdk deploy

```

You’ll notice that cdk deploy deployed your CloudFormation stack and creates the VPC and ECS cluster.

## 3. Create the IAM role

Amazon ECS needs permissions so that your Fargate task can store logs in CloudWatch. This permission is covered by the task execution IAM role. Update the stack to create the IAM role.

```ts
    const taskrole = new iam.Role(this, 'ecsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
    });
    
    taskrole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'))

```       


Let’s deploy:

```
cdk deploy

```


## 4. Build and push Docker Images to ECR

First add the code that creates the ECR repositories for the 2 applications.

```ts
    const colortellerAsset = new DockerImageAsset(this, 'colorteller', {
      repositoryName: 'colorteller',
      directory: path.join(__dirname, '../..', 'aws-app-mesh-examples/examples/apps/colorapp/src/colorteller')
    });

    const colorgatewayAsset = new DockerImageAsset(this, 'colorgateway', {
      repositoryName: 'colorgateway',
      directory: path.join(__dirname, '../..', 'aws-app-mesh-examples/examples/apps/colorapp/src/gateway')
    });

```

In the terminal of Cloud9, clone the code

```
cd ~/environment

git clone https://github.com/tohwsw/aws-app-mesh-examples.git

```

Let’s deploy:

```
cd ~/environment/ecs-workshop/
cdk deploy

```

## 5. Create the Task Definitions

First add the code that creates the ECS Task Definitions and CloudWatch Log Groups for the 2 applications to ecs-workshop-stack.ts

```ts

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
      image: ecs.ContainerImage.fromEcrRepository(colortellerAsset.repository),
      environment: {
        'COLOR': 'blue'
      },
      logging: colortellerLogDriver
    });

    const colorgatewayContainer = colorgatewayTaskDefinition.addContainer("colorgatewayContainer", {
      image: ecs.ContainerImage.fromEcrRepository(colorgatewayAsset.repository),
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

```

Let’s deploy:

```
cd ~/environment/ecs-workshop/

cdk deploy

```

## 6. That's a wrap!

You have now created the ECS cluster and the task definitions. You can proceed to lab 2 where the tasks will be run as ECS services.

Continue with [Lab2](https://github.com/aws-samples/aws-cdk-microservices-workshop/tree/master/Lab2-Create-Service-with-FarGate)

