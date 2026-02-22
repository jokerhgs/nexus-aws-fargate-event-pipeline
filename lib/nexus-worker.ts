import { Construct } from "constructs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as s3 from "aws-cdk-lib/aws-s3";

interface NexusWorkerProps {
    readonly vpc: ec2.IVpc;
    readonly database: rds.DatabaseInstance;
    readonly queue: sqs.Queue;
    readonly bucket: s3.IBucket;
}

export class NexusWorker extends Construct {

    constructor(scope: Construct, id: string, props: NexusWorkerProps) {
        super(scope, id);

        // 1. The Cluster: Logical isolation for your services
        const cluster = new ecs.Cluster(this, 'NexusCluster', { vpc: props.vpc });

        // 2. The Task Definition: The blueprint for your container
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'NexusTaskDef', {
            cpu: 256,
            memoryLimitMiB: 512,
        });

        // 3. The Container: Adding the actual logic
        taskDefinition.addContainer('WorkerContainer', {
            image: ecs.ContainerImage.fromAsset('.'), // Builds the Dockerfile in the root folder automatically
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'Nexus' }),
        });

        // 4. The Service: The manager that ensures 1 instance is always running
        const service = new ecs.FargateService(this, 'NexusService', {
            cluster,
            taskDefinition,
            desiredCount: 1,
            assignPublicIp: false, // Enforces Zero-Trust
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        });

        // 5. Connectivity: Allow the worker to connect to the database
        props.database.connections.allowDefaultPortFrom(service);

        // 6. Config: Pass connection info to the container
        taskDefinition.defaultContainer?.addEnvironment('DB_HOST', props.database.dbInstanceEndpointAddress);
        taskDefinition.defaultContainer?.addEnvironment('DB_PORT', props.database.dbInstanceEndpointPort);

        if (props.database.secret) {
            taskDefinition.defaultContainer?.addSecret('DB_USER', ecs.Secret.fromSecretsManager(props.database.secret, 'username'));
            taskDefinition.defaultContainer?.addSecret('DB_PASSWORD', ecs.Secret.fromSecretsManager(props.database.secret, 'password'));
        }
        taskDefinition.defaultContainer?.addEnvironment('DB_NAME', 'postgres');

        // 7. Connectivity: Allow the worker to connect to the queue
        props.queue.grantConsumeMessages(taskDefinition.taskRole!);

        // 8. Connectivity: Allow the worker to connect to the bucket
        props.bucket.grantRead(taskDefinition.taskRole!);

        // 9. Config: Pass queue and bucket info to the container
        taskDefinition.defaultContainer?.addEnvironment('QUEUE_URL', props.queue.queueUrl);
        taskDefinition.defaultContainer?.addEnvironment('BUCKET_NAME', props.bucket.bucketName);

    }


}