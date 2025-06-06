from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright
from config.constants import *
from slugify import slugify
from pages.homePage import HomePage
from pages.loginPage import LoginPage
from dotenv import load_dotenv
import os


@pytest.fixture(scope="session")
def login_logout():
    # perform login and browser close once in a session
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        context.set_default_timeout(80000)
        page = context.new_page()
        # Navigate to the login URL
        page.goto(URL)
        # Wait for the login form to appear
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(5000)
        # # login to web url with username and password
        # login_page = LoginPage(page)
        # load_dotenv()
        # login_page.authenticate(os.getenv('user_name'), os.getenv('pass_word'))

        yield page

        # perform close the browser
        browser.close()


@pytest.hookimpl(tryfirst=True)
def pytest_html_report_title(report):
    report.title = "Automation_BYOc_ClientAdvisor"


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    pytest_html = item.config.pluginmanager.getplugin("html")
    outcome = yield
    screen_file=""
    report = outcome.get_result()
    extra = getattr(report, "extra", [])
    if report.when == "call":
        if report.failed and "page" in item.funcargs:
            page = item.funcargs["page"]
            screenshot_dir = Path("screenshots")
            screenshot_dir.mkdir(exist_ok=True)
            screen_file = str(screenshot_dir / f"{slugify(item.nodeid)}.png")
            page.screenshot(path=screen_file)
        xfail = hasattr(report, "wasxfail")
        if (report.skipped and xfail) or (report.failed and not xfail):
            # add the screenshots to the html report
            extra.append(pytest_html.extras.png(screen_file))
        report.extras = extra
