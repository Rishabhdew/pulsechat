pipeline {

    agent any

    environment {

       IMAGE_NAME = "rish9981/pulsechat"

    }

    stages {

        stage('Install Dependencies') {

            steps {

                sh '/opt/homebrew/bin/npm install'

            }

        }

        stage('Run Tests') {

            steps {

                sh '/opt/homebrew/bin/npm test'

            }

        }

        stage('Build Docker Image') {

            steps {

                sh '/usr/local/bin/docker build -t $IMAGE_NAME:latest .'

            }

        }

        stage('Push Docker Image') {

            steps {

                sh '/usr/local/bin/docker push $IMAGE_NAME:latest'

            }

        }

        stage('Deploy to Kubernetes') {

            steps {

                sh '/usr/local/bin/kubectl apply -f deployment.yaml'

                sh '/usr/local/bin/kubectl apply -f service.yaml'

                sh '/usr/local/bin/kubectl apply -f hpa.yaml'

            }

        }

    }

}