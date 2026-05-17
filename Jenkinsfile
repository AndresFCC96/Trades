// =============================================================================
// Trade Pipeline · Jenkins CI
// =============================================================================
// Mirror of .github/workflows/ci.yml so the same 7 quality gates can run on
// Jenkins. Each stage uses its own Docker image (declarative `agent { docker }`)
// so the build is hermetic and reproducible across Jenkins controllers.
//
// Prerequisites on the controller:
//   - `docker-workflow` plugin (provides `agent { docker }`)
//   - `git` plugin
//   - `htmlpublisher` plugin (optional, for the Playwright report)
//   - `credentials-binding` plugin
//   - Docker daemon reachable by the build node (the docker socket is needed
//     for the "Docker build smoke" stage)
//
// Credentials expected (Manage Jenkins → Credentials):
//   - `codecov-token` (Secret text) — optional; uploads pytest coverage to
//     Codecov. If absent, that step is a no-op.
//
// Triggers: webhook from GitHub or multibranch scan; we don't hard-code
// `triggers {}` here because that depends on the Jenkins job type.
// =============================================================================

pipeline {
    agent none

    options {
        timestamps()
        ansiColor('xterm')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 30, unit: 'MINUTES')
        skipDefaultCheckout(false)
    }

    environment {
        PYTHON_IMAGE     = 'python:3.12-slim'
        NODE_IMAGE       = 'node:20-bullseye'
        SEMGREP_IMAGE    = 'returntocorp/semgrep:latest'
        PLAYWRIGHT_IMAGE = 'mcr.microsoft.com/playwright:v1.45.0-jammy'
    }

    stages {

        // -------------------------------------------------------------------
        // Quality gates — five jobs that fan out in parallel, mirroring the
        // matrix in GH Actions (lint, pytest, bandit, semgrep, web).
        // -------------------------------------------------------------------
        stage('Quality gates') {
            parallel {

                stage('Lint (ruff)') {
                    agent { docker { image env.PYTHON_IMAGE } }
                    steps {
                        sh '''
                            set -e
                            pip install --no-cache-dir "ruff>=0.6.0"
                            if [ -d src ] || [ -d tests ]; then
                                ruff check .
                            else
                                echo "No source yet — skipping ruff"
                            fi
                        '''
                    }
                }

                stage('Test (pytest)') {
                    agent { docker { image env.PYTHON_IMAGE } }
                    steps {
                        sh '''
                            set -e
                            python -m pip install --upgrade pip
                            pip install --no-cache-dir -r requirements.txt
                            if [ ! -d src ] || [ ! -d tests ]; then
                                echo "No src/ or tests/ yet — skipping pytest"
                                exit 0
                            fi
                            pytest \
                                --cov=src \
                                --cov-report=xml \
                                --cov-report=term \
                                --junitxml=pytest-junit.xml
                        '''
                    }
                    post {
                        always {
                            junit allowEmptyResults: true, testResults: 'pytest-junit.xml'
                            archiveArtifacts artifacts: 'coverage.xml', allowEmptyArchive: true
                        }
                        success {
                            // Codecov upload — non-blocking if token absent or upload fails.
                            withCredentials([
                                string(credentialsId: 'codecov-token',
                                       variable: 'CODECOV_TOKEN',
                                       defaultValue: '')
                            ]) {
                                sh '''
                                    if [ -f coverage.xml ] && [ -n "${CODECOV_TOKEN:-}" ]; then
                                        curl -fsS -Os https://uploader.codecov.io/latest/linux/codecov || true
                                        chmod +x codecov || true
                                        ./codecov -t "$CODECOV_TOKEN" -f coverage.xml -F unittests \
                                          || echo "codecov upload failed (non-blocking)"
                                    else
                                        echo "Skipping Codecov upload (no token or no coverage.xml)"
                                    fi
                                '''
                            }
                        }
                    }
                }

                stage('Security (bandit)') {
                    agent { docker { image env.PYTHON_IMAGE } }
                    steps {
                        sh '''
                            set -e
                            pip install --no-cache-dir "bandit[toml]>=1.7.10"
                            if [ -d src ]; then
                                bandit -r src/ -c pyproject.toml
                            else
                                echo "No src/ yet — skipping bandit"
                            fi
                        '''
                    }
                }

                stage('Security (semgrep)') {
                    agent { docker { image env.SEMGREP_IMAGE } }
                    steps {
                        sh '''
                            set -e
                            if [ -d src ]; then
                                semgrep scan \
                                    --config=p/python \
                                    --config=p/security-audit \
                                    --config=p/owasp-top-ten \
                                    --severity=ERROR --severity=WARNING \
                                    --error || echo "::warning::Semgrep findings detected"
                            else
                                echo "No src/ yet — skipping semgrep"
                            fi
                        '''
                    }
                }

                stage('Web (vitest + typecheck)') {
                    agent { docker { image env.NODE_IMAGE } }
                    steps {
                        sh '''
                            set -e
                            if [ ! -d web ] || [ ! -f web/package.json ]; then
                                echo "No web/ yet — skipping"
                                exit 0
                            fi
                            cd web
                            npm ci || npm install
                            npm run lint
                            npm test
                        '''
                    }
                }
            }
        }

        // -------------------------------------------------------------------
        // Docker build smoke test — requires the build node to have a Docker
        // daemon. Uses the `docker:24-cli` image with the host socket mounted.
        // -------------------------------------------------------------------
        stage('Docker build smoke test') {
            when {
                expression {
                    fileExists('Dockerfile') && fileExists('src') && fileExists('config')
                }
            }
            agent {
                docker {
                    image 'docker:24-cli'
                    args '-v /var/run/docker.sock:/var/run/docker.sock'
                }
            }
            steps {
                sh 'docker build --pull -t trade-pipeline:ci-${BUILD_NUMBER} .'
            }
        }

        // -------------------------------------------------------------------
        // E2E with Playwright — orchestrates uvicorn (FastAPI backend) and
        // Vite dev server, then runs the Playwright suite from web/e2e.
        // Mirrors the `e2e` job in .github/workflows/ci.yml.
        // -------------------------------------------------------------------
        stage('E2E (playwright)') {
            when { expression { fileExists('web/e2e') } }
            agent {
                docker {
                    image env.PLAYWRIGHT_IMAGE
                    args '-u root'  // playwright image needs root for apt-get
                }
            }
            steps {
                sh '''
                    set -e

                    # Install Python so we can boot the backend in the same
                    # container as the Playwright runner.
                    apt-get update -qq
                    apt-get install -y -qq python3 python3-pip python3-venv curl

                    python3 -m pip install --upgrade pip
                    pip install --no-cache-dir -r requirements.txt

                    # Web deps + browsers (chromium only, matches the GH job)
                    cd web
                    npm ci || npm install
                    npx playwright install --with-deps chromium
                    cd ..

                    # Start the backend in the background and wait for /health
                    nohup uvicorn src.api.main:app --host 127.0.0.1 --port 8001 \
                        > uvicorn.log 2>&1 &
                    for i in $(seq 1 30); do
                        if curl -s http://127.0.0.1:8001/health > /dev/null; then
                            echo "backend up"
                            break
                        fi
                        sleep 1
                    done

                    cd web && npm run e2e
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'web/playwright-report/**', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'uvicorn.log', allowEmptyArchive: true
                }
                failure {
                    // Surface the rendered HTML report in the Jenkins build page
                    // when the htmlpublisher plugin is installed.
                    publishHTML target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'web/playwright-report',
                        reportFiles: 'index.html',
                        reportName: 'Playwright report'
                    ]
                }
            }
        }
    }

    post {
        always {
            echo "Build finished with status: ${currentBuild.currentResult}"
        }
    }
}
