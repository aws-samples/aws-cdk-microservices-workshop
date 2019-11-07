

# Getting Started with ECS

## Overview

This lab introduces the basics of working with microservices and [ECS](https://aws.amazon.com/ecs/). This includes: setting up the initial ECS cluster, deploying the sample application, service discovery via Route53 and deployment of the containers with traffic routed through an [ALB](https://aws.amazon.com/elasticloadbalancing/applicationloadbalancer/). The sample application that will be running on ECS requires a couple Docker images built and placed in an ECR repository that your ECS cluster has access to.

**Note**: You should have containers and Docker knowledge before attempting this lab. You should know the basics of creating a Docker file and a Docker image, and checking in the image into a Docker registry. Otherwise, please complete part 1 and 2 of the [Get Started with Docker tutorial](https://docs.docker.com/get-started/).

The sample application consists of ColorGateway and ColorTeller applications. 

**ColorGateway**

Color-gateway is a simple http service written in go that is exposed to external clients and responds to http://service-name:port/color that responds with color retrieved from color-teller and histogram of colors observed at the server that responded so far. For e.g.

```
$ curl -s http://colorgateway.default.svc.cluster.local:9080/color
{"color":"blue", "stats": {"blue":"1"}}
```

color-gateway app runs as a service in ECS, and exposed via external load-balancer (ALB). 

**ColorTeller**

Color-teller is a simple http service written in go that is configured to return a color. This configuration is provided as environment variable and is run within a task. Multiple versions of this service are deployed each configured to return a specific color.

At the microservice level the application looks like this:

![img1]

[img1]:https://github.com/tohwsw/aws-ecs-workshop/blob/master/Lab1-Getting-Started-with-ECS/img/microservicesapp.png

They shall be deployed using AWS Fargate, which allows you to run containers without managing servers. We shall deploy two instances of Gateway container and 2 instances of ColorTeller. ColorTeller containers register with a Route53 private hosted zone. ColorGateway discovers the ColorTeller via a service lookup to Route53. We will use an Application load balancer to route the requests to ColorGateway.

The lab architecture on AWS is shown below:

![img2]

[img2]:https://github.com/tohwsw/aws-ecs-workshop/blob/master/Lab1-Getting-Started-with-ECS/img/1-lab-architecture.png

**Note**: 
You'll need to have a working AWS account to use this lab.

Start on [Lab1](https://github.com/tohwsw/aws-ecs-workshop/tree/master/Lab1-Getting-Started-with-ECS)

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

