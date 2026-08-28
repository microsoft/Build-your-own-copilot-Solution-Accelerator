PIP_INDEX_URL="${PIP_INDEX_URL:-https://packagefeedproxy.microsoft.io/pypi/simple/}" \
pip install -r requirements.txt --user -q

azd init -t microsoft/Build-your-own-copilot-Solution-Accelerator