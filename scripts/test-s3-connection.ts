import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  ListBucketsCommand,
  HeadBucketCommand
} from "@aws-sdk/client-s3";

// Check required environment variables
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_S3_BUCKET_NAME'
];

console.log('🔍 AWS S3 Connection Diagnostic Tool\n');
console.log('=' .repeat(60));

// Step 1: Check environment variables
console.log('\n📋 Step 1: Checking Environment Variables...');
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars.join(', '));
  process.exit(1);
}

console.log('✅ All required environment variables are set');
console.log(`   Region: ${process.env.AWS_REGION}`);
console.log(`   Bucket: ${process.env.AWS_S3_BUCKET_NAME}`);

// Step 2: Initialize S3 Client
console.log('\n🔧 Step 2: Initializing AWS S3 Client...');
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
console.log('✅ S3 Client initialized');

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const TEST_KEY = `test-connection-${Date.now()}.txt`;
const TEST_CONTENT = 'This is a test file to verify S3 connection';

async function runDiagnostics() {
  try {
    // Step 3: Test AWS Credentials
    console.log('\n🔑 Step 3: Testing AWS Credentials...');
    try {
      const listBucketsCommand = new ListBucketsCommand({});
      const bucketsResponse = await s3Client.send(listBucketsCommand);
      console.log('✅ AWS credentials are valid');
      console.log(`   Found ${bucketsResponse.Buckets?.length || 0} buckets in your account`);
      
      if (bucketsResponse.Buckets && bucketsResponse.Buckets.length > 0) {
        console.log('\n   Available buckets:');
        bucketsResponse.Buckets.forEach(bucket => {
          console.log(`   - ${bucket.Name}`);
        });
      }
    } catch (error: any) {
      console.error('❌ AWS credentials test failed');
      console.error(`   Error: ${error.message}`);
      if (error.name === 'InvalidAccessKeyId') {
        console.error('\n💡 Suggested fix: AWS_ACCESS_KEY_ID is invalid or expired');
        console.error('   Please update your AWS credentials in Replit Secrets');
      }
      throw error;
    }

    // Step 4: Check if bucket exists
    console.log('\n📦 Step 4: Checking if bucket exists...');
    try {
      const headBucketCommand = new HeadBucketCommand({ Bucket: BUCKET_NAME });
      await s3Client.send(headBucketCommand);
      console.log(`✅ Bucket "${BUCKET_NAME}" exists and is accessible`);
    } catch (error: any) {
      console.error(`❌ Cannot access bucket "${BUCKET_NAME}"`);
      console.error(`   Error: ${error.message}`);
      
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.error('\n💡 Suggested fix: The bucket does not exist');
        console.error('   Options:');
        console.error('   1. Create this bucket in AWS S3 console');
        console.error('   2. Update AWS_S3_BUCKET_NAME to an existing bucket');
      } else if (error.name === 'Forbidden' || error.$metadata?.httpStatusCode === 403) {
        console.error('\n💡 Suggested fix: Access denied to this bucket');
        console.error('   Check IAM permissions for your access key');
      }
      throw error;
    }

    // Step 5: Test upload
    console.log('\n⬆️  Step 5: Testing file upload...');
    try {
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: TEST_KEY,
        Body: Buffer.from(TEST_CONTENT),
        ContentType: 'text/plain',
      });
      await s3Client.send(putCommand);
      console.log(`✅ Successfully uploaded test file: ${TEST_KEY}`);
    } catch (error: any) {
      console.error('❌ Upload test failed');
      console.error(`   Error: ${error.message}`);
      
      if (error.name === 'AccessDenied') {
        console.error('\n💡 Suggested fix: IAM permissions missing for PutObject');
        console.error('   Required permission: s3:PutObject');
      }
      throw error;
    }

    // Step 6: Test download
    console.log('\n⬇️  Step 6: Testing file download...');
    try {
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: TEST_KEY,
      });
      const response = await s3Client.send(getCommand);
      const downloadedContent = await response.Body?.transformToString();
      
      if (downloadedContent === TEST_CONTENT) {
        console.log('✅ Successfully downloaded and verified test file');
      } else {
        console.error('⚠️  Downloaded file content does not match');
      }
    } catch (error: any) {
      console.error('❌ Download test failed');
      console.error(`   Error: ${error.message}`);
      
      if (error.name === 'AccessDenied') {
        console.error('\n💡 Suggested fix: IAM permissions missing for GetObject');
        console.error('   Required permission: s3:GetObject');
      }
      throw error;
    }

    // Step 7: Test delete
    console.log('\n🗑️  Step 7: Testing file deletion...');
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: TEST_KEY,
      });
      await s3Client.send(deleteCommand);
      console.log('✅ Successfully deleted test file');
    } catch (error: any) {
      console.error('❌ Delete test failed');
      console.error(`   Error: ${error.message}`);
      
      if (error.name === 'AccessDenied') {
        console.error('\n💡 Suggested fix: IAM permissions missing for DeleteObject');
        console.error('   Required permission: s3:DeleteObject');
      }
      throw error;
    }

    // All tests passed!
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SUCCESS! All S3 connection tests passed!');
    console.log('='.repeat(60));
    console.log('\n✅ Your AWS S3 configuration is working correctly');
    console.log(`✅ Region: ${process.env.AWS_REGION}`);
    console.log(`✅ Bucket: ${BUCKET_NAME}`);
    console.log('\n💡 Your S3 connection is ready to use for document uploads!');

  } catch (error: any) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ DIAGNOSTIC FAILED');
    console.log('='.repeat(60));
    console.error('\nThe S3 connection test encountered errors.');
    console.error('Please review the error messages above and apply suggested fixes.');
    console.error('\nCommon solutions:');
    console.error('1. Update expired AWS credentials');
    console.error('2. Verify bucket exists and name is correct');
    console.error('3. Check IAM permissions for your access key');
    console.error('4. Ensure bucket is in the correct region');
    process.exit(1);
  }
}

runDiagnostics();
