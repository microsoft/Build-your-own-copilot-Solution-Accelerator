FROM mcr.microsoft.com/devcontainers/python:1-3.11-bullseye

ENV NPM_CONFIG_REGISTRY=https://packagefeedproxy.microsoft.io/npm/ \
	PIP_INDEX_URL=https://packagefeedproxy.microsoft.io/pypi/simple/

# Remove Yarn repository to avoid GPG key expiration issue
RUN rm -f /etc/apt/sources.list.d/yarn.list
