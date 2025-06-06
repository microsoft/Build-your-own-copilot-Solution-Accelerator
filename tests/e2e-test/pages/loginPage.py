from asyncio import timeout
from playwright.sync_api import sync_playwright,TimeoutError as PlaywightTimeoutError
from base.base import BasePage


class LoginPage(BasePage):

    EMAIL_TEXT_BOX = "//input[@type='email']"
    NEXT_BUTTON = "//input[@type='submit']"
    PASSWORD_TEXT_BOX = "//input[@type='password']"
    SIGNIN_BUTTON = "//input[@id='idSIButton9']"
    YES_BUTTON = "//input[@id='idSIButton9']"
    PERMISSION_ACCEPT_BUTTON = "//input[@type='submit']"

    def __init__(self, page):
        self.page = page

    def authenticate(self, username,password):
        # login with username and password in web url
        self.page.locator(self.EMAIL_TEXT_BOX).fill(username)
        self.page.locator(self.NEXT_BUTTON).click()

        # Wait for the password input field to be available and fill it
        self.page.wait_for_load_state('networkidle')
        # Enter password
        self.page.locator(self.PASSWORD_TEXT_BOX).fill(password)
        # Click on SignIn button
        self.page.locator(self.SIGNIN_BUTTON).click()
        self.page.wait_for_load_state('networkidle')
        try:
            self.page.locator(self.YES_BUTTON).wait_for(state='visible',timeout=30000)
            # Click on YES button
            self.page.locator(self.YES_BUTTON).click()
        except PlaywightTimeoutError:
            pass
        self.page.wait_for_load_state('networkidle')
        try:
            self.page.locator(self.PERMISSION_ACCEPT_BUTTON).wait_for(state='visible',timeout=5000)
            # Click on Permissions ACCEPT button
            self.page.locator(self.PERMISSION_ACCEPT_BUTTON).click()
        except PlaywightTimeoutError:
            pass
        self.page.wait_for_load_state('networkidle')
