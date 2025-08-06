from bs4 import BeautifulSoup
import pytest
from playwright.sync_api import sync_playwright
from config.constants import *
import logging
import atexit
import os
import io

# Playwright session-scoped login/logout fixture
@pytest.fixture(scope="session")
def login_logout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        context.set_default_timeout(80000)
        page = context.new_page()
        page.goto(URL)
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(5000)
        # Optional login steps
        # login_page = LoginPage(page)
        # load_dotenv()
        # login_page.authenticate(os.getenv('user_name'), os.getenv('pass_word'))

        yield page

        browser.close()

# Change HTML report title
@pytest.hookimpl(tryfirst=True)
def pytest_html_report_title(report):
    report.title = "Automation_BYOc_ClientAdvisor"

log_streams = {}

# Capture logs per test
@pytest.hookimpl(tryfirst=True)
def pytest_runtest_setup(item):
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setLevel(logging.INFO)
    logger = logging.getLogger()
    logger.addHandler(handler)
    log_streams[item.nodeid] = (handler, stream)

# Add captured logs to report
@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    handler, stream = log_streams.get(item.nodeid, (None, None))
    if handler and stream:
        handler.flush()
        log_output = stream.getvalue()
        logger = logging.getLogger()
        logger.removeHandler(handler)
        report.description = f"<pre>{log_output.strip()}</pre>"
        log_streams.pop(item.nodeid, None)
    else:
        report.description = ""

# Optional: simplify test display names if using `prompt`
def pytest_collection_modifyitems(items):
    for item in items:
        # Retain only the readable part after the last `[` and before the closing `]`
        if "[" in item.nodeid and "]" in item.nodeid:
            pretty_name = item.nodeid.split("[", 1)[1].rsplit("]", 1)[0]
            item._nodeid = pretty_name
        else:
            # Use function name as fallback
            item._nodeid = item.name


# Rename 'Duration' column in HTML report
def rename_duration_column():
    report_path = os.path.abspath("report.html")
    if not os.path.exists(report_path):
        print("Report file not found, skipping column rename.")
        return

    with open(report_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    headers = soup.select('table#results-table thead th')
    for th in headers:
        if th.text.strip() == 'Duration':
            th.string = 'Execution Time'
            break
    else:
        print("'Duration' column not found in report.")

    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(str(soup))

# Run after tests complete
atexit.register(rename_duration_column)
