import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { NexusWorker } from './nexus-worker';
import { NexusVPC } from './nexus-vpc';
import { NexusDatabase } from './nexus-database';
import { NexusQueue } from './nexus-queue';
import { NexusBucket } from './nexus-bucket'
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class NexusStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const network = new NexusVPC(this, 'NexusNetwork');

    const database = new NexusDatabase(this, 'NexusDatabase', {
      vpc: network.vpc,
    });

    const queue = new NexusQueue(this, 'NexusQueue');

    const bucket = new NexusBucket(this, 'NexusBucket');

    new NexusWorker(this, 'NexusWorker', {
      vpc: network.vpc,
      database: database.instance,
      queue: queue.queue,
      bucket: bucket.bucket,
    });

    // Wire up S3 Events to SQS
    bucket.bucket.addObjectCreatedNotification(new s3n.SqsDestination(queue.queue));



  }
}
