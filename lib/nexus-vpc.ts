import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class NexusVPC extends Construct {
    public readonly vpc: ec2.IVpc;

    constructor(scope: Construct, id: string) {
        super(scope, id);


        this.vpc = new ec2.Vpc(this, 'NexusVpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
            maxAzs: 2,
            natGateways: 0,
            subnetConfiguration: [
                {
                    name: 'private',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 24,
                },
            ],
        })

        // Required for ECR to store the actual image layers in S3
        this.vpc.addGatewayEndpoint('S3Endpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
        })

        // Required for authentication and registry API calls
        const ecrApi = this.vpc.addInterfaceEndpoint('ECREndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR
        })

        // Required for the Docker client to pull images
        const ecrDocker = this.vpc.addInterfaceEndpoint('ECRDockerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER
        })
        ecrDocker.node.addDependency(ecrApi);

        // Required for ECS to send logs to CloudWatch
        const logs = this.vpc.addInterfaceEndpoint('CloudWatchEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        });
        logs.node.addDependency(ecrDocker);

        // Required for ECS tasks to retrieve credentials from Secrets Manager
        const secrets = this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
        });
        secrets.node.addDependency(logs);

        // Required for the worker to poll messages from SQS
        const sqs = this.vpc.addInterfaceEndpoint('SQSEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SQS,
        });
        sqs.node.addDependency(secrets);

    }

}