pipeline {
    agent any

    stages {

        stage('Clone Code') {
            steps {
                git 'https://github.com/Rishabhdew/chat-app.git'
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
