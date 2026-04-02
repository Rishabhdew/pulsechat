pipeline {
    agent any

    stages {

        stage('Clone Code') {
            steps {
                git 'https://github.com/YOUR_USERNAME/chat-app.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t pulsechat .'
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh 'kubectl apply -f deployment.yaml'
                sh 'kubectl apply -f service.yaml'
                sh 'kubectl apply -f hpa.yaml'
            }
        }
    }
}
