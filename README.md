# Tick-Tack Time Display App

A simple full-stack application that displays time with a tick-tack animation. The application includes both frontend and backend components, containerized with Docker, and set up for CI/CD deployment to AWS.

## Project Structure

```
.
├── Client/                  # React TypeScript frontend
│   ├── src/                 # Frontend source code
│   ├── Dockerfile           # Frontend Docker configuration
│   └── nginx.conf           # Nginx configuration for containerized frontend
├── Server/                  # Node.js Express backend
│   ├── index.js             # Backend server code
│   └── Dockerfile           # Backend Docker configuration
├── docker-compose.yml       # Docker Compose configuration
└── .github/
    └── workflows/
        └── deploy.yml       # AWS CI/CD workflow configuration
```

## Features

- Real-time clock display that updates every second
- Visual "Tick" "Tack" animation that alternates
- Server time fetched from backend API
- Containerized with Docker for consistent deployment
- CI/CD workflow for seamless updates to AWS

## Running the App Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Development Mode

1. Install backend dependencies:
   ```bash
   cd Server
   npm install
   ```

2. Install frontend dependencies:
   ```bash
   cd Client
   npm install
   ```

3. Start the backend server:
   ```bash
   cd Server
   npm start
   ```

4. In a new terminal, start the frontend development server:
   ```bash
   cd Client
   npm run dev
   ```

### Using Docker

To run both frontend and backend using Docker Compose:

```bash
docker-compose up
```

The application will be available at:
- Frontend: http://localhost
- Backend API: http://localhost:3001/api/time

## AWS Deployment

### Prerequisites

1. AWS Account
2. GitHub repository for your code
3. AWS IAM user with appropriate permissions
4. AWS CLI installed and configured

### Setup AWS Resources

1. Create ECR repositories for frontend and backend:
   ```bash
   aws ecr create-repository --repository-name tick-tack-frontend
   aws ecr create-repository --repository-name tick-tack-backend
   ```

2. Create an ECS cluster:
   ```bash
   aws ecs create-cluster --cluster-name tick-tack-cluster
   ```

3. Create task definitions (make sure to replace placeholders with your AWS account ID):
   ```bash
   # Create a file named task-definition-backend.json with the following content:
   {
     "family": "tick-tack-backend",
     "executionRoleArn": "arn:aws:iam::YOUR_AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
     "networkMode": "awsvpc",
     "containerDefinitions": [
       {
         "name": "tick-tack-backend",
         "image": "YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tick-tack-backend:latest",
         "essential": true,
         "portMappings": [
           {
             "containerPort": 3001,
             "hostPort": 3001,
             "protocol": "tcp"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/tick-tack-backend",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         },
         "healthCheck": {
           "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
           "interval": 30,
           "timeout": 5,
           "retries": 3,
           "startPeriod": 60
         }
       }
     ],
     "requiresCompatibilities": [
       "FARGATE"
     ],
     "cpu": "256",
     "memory": "512"
   }

   # Create a file named task-definition-frontend.json with the following content:
   {
     "family": "tick-tack-frontend",
     "executionRoleArn": "arn:aws:iam::YOUR_AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
     "networkMode": "awsvpc",
     "containerDefinitions": [
       {
         "name": "tick-tack-frontend",
         "image": "YOUR_AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/tick-tack-frontend:latest",
         "essential": true,
         "portMappings": [
           {
             "containerPort": 80,
             "hostPort": 80,
             "protocol": "tcp"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/tick-tack-frontend",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         },
         "healthCheck": {
           "command": ["CMD-SHELL", "curl -f http://localhost:80 || exit 1"],
           "interval": 30,
           "timeout": 5,
           "retries": 3,
           "startPeriod": 60
         }
       }
     ],
     "requiresCompatibilities": [
       "FARGATE"
     ],
     "cpu": "256",
     "memory": "512"
   }
   ```

4. Register the task definitions:
   ```bash
   aws ecs register-task-definition --cli-input-json file://task-definition-backend.json
   aws ecs register-task-definition --cli-input-json file://task-definition-frontend.json
   ```

5. Create an IAM role for ECS task execution if you don't have one already:
   ```bash
   aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://ecs-trust-policy.json
   aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
   ```

   Where ecs-trust-policy.json contains:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Service": "ecs-tasks.amazonaws.com"
         },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```

6. Create VPC, subnets, and security groups (or use existing ones):
   ```bash
   # Create a security group that allows inbound traffic on ports 80 and 3001
   aws ec2 create-security-group --group-name tick-tack-sg --description "Security group for tick-tack app" --vpc-id YOUR_VPC_ID
   aws ec2 authorize-security-group-ingress --group-id YOUR_SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
   aws ec2 authorize-security-group-ingress --group-id YOUR_SG_ID --protocol tcp --port 3001 --cidr 0.0.0.0/0
   ```

7. Create the ECS services:
   ```bash
   aws ecs create-service --cluster tick-tack-cluster --service-name tick-tack-backend-service --task-definition tick-tack-backend --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[YOUR_SUBNET_ID],securityGroups=[YOUR_SG_ID],assignPublicIp=ENABLED}"

   aws ecs create-service --cluster tick-tack-cluster --service-name tick-tack-frontend-service --task-definition tick-tack-frontend --desired-count 1 --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[YOUR_SUBNET_ID],securityGroups=[YOUR_SG_ID],assignPublicIp=ENABLED}"
   ```

8. Create CloudWatch Log Groups:
   ```bash
   aws logs create-log-group --log-group-name /ecs/tick-tack-backend
   aws logs create-log-group --log-group-name /ecs/tick-tack-frontend
   ```

9. Set up GitHub Secrets:
   - Go to your GitHub repository
   - Navigate to Settings > Secrets > Actions
   - Add the following secrets:
     - `AWS_ACCESS_KEY_ID`: Your AWS access key
     - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

10. Push your code to GitHub to trigger the CI/CD pipeline:
    ```bash
    git add .
    git commit -m "Initial commit"
    git push origin main
    ```

## Additional Configuration

### Load Balancer Setup (Optional)

For production environments, you may want to set up an Application Load Balancer:

```bash
# Create a load balancer
aws elbv2 create-load-balancer --name tick-tack-lb --subnets YOUR_SUBNET_ID_1 YOUR_SUBNET_ID_2 --security-groups YOUR_SG_ID

# Create target groups
aws elbv2 create-target-group --name tick-tack-frontend-tg --protocol HTTP --port 80 --vpc-id YOUR_VPC_ID --target-type ip --health-check-path / --health-check-interval-seconds 30

aws elbv2 create-target-group --name tick-tack-backend-tg --protocol HTTP --port 3001 --vpc-id YOUR_VPC_ID --target-type ip --health-check-path /health --health-check-interval-seconds 30

# Create listeners
aws elbv2 create-listener --load-balancer-arn YOUR_LB_ARN --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=YOUR_FRONTEND_TG_ARN

aws elbv2 create-listener --load-balancer-arn YOUR_LB_ARN --protocol HTTP --port 3001 --default-actions Type=forward,TargetGroupArn=YOUR_BACKEND_TG_ARN
```

Then update your ECS services to use the load balancer:

```bash
aws ecs update-service --cluster tick-tack-cluster --service tick-tack-frontend-service --load-balancers "targetGroupArn=YOUR_FRONTEND_TG_ARN,containerName=tick-tack-frontend,containerPort=80"

aws ecs update-service --cluster tick-tack-cluster --service tick-tack-backend-service --load-balancers "targetGroupArn=YOUR_BACKEND_TG_ARN,containerName=tick-tack-backend,containerPort=3001"
```

## Troubleshooting

- **Connection issues between frontend and backend**: Make sure both services are running and the backend URL is correctly set in the frontend environment variables.
- **AWS deployment failures**: Check the GitHub Actions logs and AWS CloudWatch logs for error messages.
- **Docker build issues**: Ensure Docker is installed correctly and running on your machine.