from base.base import BasePage


class ArticlesPage(BasePage):
    ARTICLES_ICON = "//button[@aria-label='button']//following-sibling::span[text()='Articles']"
    ARTICLES_PAGE_TITLE = "//div/h2[text()='Explore scientific journals']"
    TYPE_QUESTION_TEXT_AREA = "//textarea[@id='TextField10']"
    SEND_BUTTON = "div[role='button'][aria-label='Ask question button']"
    RESPONSE_REFERENCE_EXPAND_ICON = "span[aria-label='Open references'][role='button']"
    REFERENCE_LINK_IN_RESPONSE = "(//span[@class = '_citationContainer_10f7k_58'])[1]"
    FAVORITE_BUTTON = "//i[@data-icon-name='CirclePlus']"
    REMOVE_FAVORITE_ICON = "//button[@title='remove']"
    REFERENCE_LINKS_IN_RESPONSE = "//span[@class = '_citationContainer_10f7k_58']"
    CLOSE_FAVORITE_SECTION_ICON = "(//span[@class='fui-Button__icon rywnvv2'])[1]"
    CLOSE_REFERENCE_SECTION_ICON = "//i[@data-icon-name='Cancel']"
    CHAT_HISTORY_QUESTION_TEXT = "//div[text() = 'What are the effects of influenza vaccine on immunocompromised populations?']"
    CLEAR_CHAT_HISTORY ="//button[@aria-label='clear chat button']"

    def __init__(self, page):
        self.page = page

    def click_articles_icon(self):
        # click on Articles icon on welcome page
        self.page.locator(self.ARTICLES_ICON).click()

    def enter_a_question(self,text):
        # Type a question in the text area
        self.page.locator(self.TYPE_QUESTION_TEXT_AREA).fill(text)
        self.page.wait_for_timeout(5000)

    def click_send_button(self):
        # Click on send button in question area
        self.page.locator(self.SEND_BUTTON).click()
        self.page.wait_for_timeout(5000)
        self.page.wait_for_load_state('networkidle')

    def click_expand_reference_in_response(self):
        # Click on expand in response reference area
        self.page.wait_for_timeout(5000)
        expand_icon = self.page.locator(self.RESPONSE_REFERENCE_EXPAND_ICON)
        expand_icon.nth(expand_icon.count()-1).click()
        self.page.wait_for_load_state('networkidle')
        self.page.wait_for_timeout(5000)

    def click_reference_link_in_response(self):
        # Click on reference link response
        BasePage.scroll_into_view(self,self.page.locator(self.REFERENCE_LINKS_IN_RESPONSE))
        self.page.wait_for_timeout(2000)
        self.page.locator(self.REFERENCE_LINK_IN_RESPONSE).click()
        self.page.wait_for_load_state('networkidle')
        self.page.wait_for_timeout(5000)

    def click_favorite_button(self):
        # Click on Favorite button in References page
        self.page.locator(self.FAVORITE_BUTTON).click()
        self.page.wait_for_timeout(2000)
        self.page.wait_for_load_state('networkidle')

    def close_favorite_section(self):
        # Click on close Favorite icon in Favorites sections
        self.page.locator(self.CLOSE_FAVORITE_SECTION_ICON).click()

    def close_reference_section(self):
        # Click on close Reference icon in References sections
        self.page.locator(self.CLOSE_REFERENCE_SECTION_ICON).click()

    def history_question_text(self):
        # Get text from History chat question
        history_question_text = self.page.locator(self.CHAT_HISTORY_QUESTION_TEXT).text_content()
        self.page.wait_for_timeout(2000)
        self.page.wait_for_load_state('networkidle')
        return history_question_text
    
    def clear_history(self):
        # Get text from History chat question
        self.page.locator(self.CLEAR_CHAT_HISTORY).click()
        self.page.wait_for_timeout(2000)
        self.page.wait_for_load_state('networkidle')