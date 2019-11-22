
Lab 2 will build on Lab 1.


## 7. Create the ColorTeller Service

An ECS service helps to maintain the specified number of instances of a task definition. Add the code that creates the ECS Services.

```ts
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

```

Let’s deploy:

```
cdk deploy

```


## 8. Creating the ALB


We need an Application Load Balancer [ALB](https://aws.amazon.com/elasticloadbalancing/applicationloadbalancer/) to route traffic to our ColorGateway endpoints. An ALB lets you direct traffic between different endpoints and in this lab, we'll use it to direct traffic to the containers.

Add the code that creates the ALB.

```ts
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

```

Let’s deploy:

```
cdk deploy

```

An ALB DNS name will be shown as the output. Click on the link to view the output it in browser. Remember to append the context path /color to the DNS value.

## 9. Testing our service deployments from the console and the ALB
  

We can also test from the ALB itself. To find the DNS A record for your ALB, navigate to the EC2 Console -> **Load Balancers** -> **Select your Load Balancer**. Under **Description**, you can find details about your ALB, including a section for **DNS Name**. You can enter this value in your browser, and append the endpoint of your service, to see your ALB and ECS Cluster in action.You should be able to see the following output in the browser. For example http://ecslabalb-1194182192.ap-southeast-1.elb.amazonaws.com/color

```
{"color":"blue", "stats": {"blue":1}}

```

## 10. Cleanup

First, let’s delete the resources created by the CDK code:

```
cdk destroy

```

You can double check to see if the CloudFormation stack is successfully deleted.

Then, go and delete the Cloud9 instance.

## That's a wrap!

Congratulations! You've deployed an ECS Cluster with a microservice application!
