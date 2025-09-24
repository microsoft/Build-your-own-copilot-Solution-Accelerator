from base.base import BasePage


class HomePage(BasePage):
    HOME_PAGE_TITLE = "//h2[text()='Woodgrove Bank']"
    SIDE_PANEL_CLIENT_NAMES ="//div[contains(@class,'cardContainer')]//div[contains(@class,'clientName')]"
    SELECTED_CLIENT_NAME_LABEL = "//span[contains(@class,'selectedName')]"
    MORE_DETAILS_LINKS = "//div[contains(@class,'cardContainer')]//div[text()='More details']"
    LESS_DETAILS_LINK = "//div[contains(@class,'cardContainer')]//div[text()='Less details']"
    SIDE_PANEL_NEXT_MEETING_DETAILS = "//div[contains(@class,'selected')]/div[contains(@class,'nextMeeting')]"
    TYPE_QUESTION_TEXT_AREA = "//textarea[contains(@placeholder,'Type a new question')]"
    SEND_BUTTON = "div[role='button'][aria-label='Ask question button']"
    ANSWER_TEXT = "//div[contains(@class,'answerText')]/p"
    SHOW_CHAT_HISTORY_BUTTON="//span[text()='Show chat history']"
    SAVE_CHATHISTORY_PLUS_ICON="//i[@data-icon-name='Add']"
    SAVE_CHAT_CONFIRMATION_POPUPTEXT= "//div[contains(@class,'headerText')]"    
    SHOW_CHAT_HISTORY_DELETE_ICON="//span/i[@data-icon-name='Delete']"
    SAVED_CHAT_LABEL="(//div[contains(@class,'chatTitle')])[1]"
    CLEAR_CHAT_ICON = "//i[@data-icon-name='Broom']"
    HIDE_CHAT_HISTORY_BUTTON = "//span[text()='Hide chat history']"
    USER_CHAT_MESSAGE = "(//div[contains(@class,'chatMessageUserMessage')])[1]"
    STOP_GENERATING_LABEL = "//span[text()='Stop generating']"
    # # SHOW_CHAT_HISTORY_BUTTON = "//button[normalize-space()='Show Chat History']"
    # HIDE_CHAT_HISTORY_BUTTON = "//button[.//span[text()='Hide chat history']]"
    CHAT_HISTORY_NAME = "//div[contains(@class, 'ChatHistoryListItemCell_chatTitle')]"
    CLEAR_CHAT_HISTORY_MENU = "//button[@id='moreButton']"
    CLEAR_CHAT_HISTORY = "//button[@role='menuitem']"
    REFERENCE_LINKS_IN_RESPONSE = "//span[@role='button' and contains(@class, 'citationContainer')]"
    CLOSE_BUTTON = "svg[role='button'][tabindex='0']"

    def __init__(self, page):
        self.page = page

    def select_a_client(self,client_name):
        # scroll to the client on Home page
        BasePage.scroll_into_view(self,self.page.locator(self.SIDE_PANEL_CLIENT_NAMES),client_name)
        self.page.wait_for_timeout(2000)
        # click on desired client name
        BasePage.select_an_element(self,self.page.locator(self.SIDE_PANEL_CLIENT_NAMES),client_name)
        self.page.wait_for_timeout(5000)

    def enter_a_question(self, text):
        # Type a question in the text area
        self.page.locator(self.TYPE_QUESTION_TEXT_AREA).fill(text)
        self.page.wait_for_timeout(2000)

    def delete_chat_history(self):
        self.page.locator(self.SHOW_CHAT_HISTORY_BUTTON).click()
        chat_history = self.page.locator("//span[contains(text(),'No chat history.')]")
        if chat_history.is_visible():
            self.page.wait_for_load_state('networkidle')
            self.page.wait_for_timeout(2000)
            self.page.locator(self.HIDE_CHAT_HISTORY_BUTTON).click()


        else:
            self.page.locator(self.CLEAR_CHAT_HISTORY_MENU).click()
            self.page.locator(self.CLEAR_CHAT_HISTORY).click()
            self.page.wait_for_timeout(4000)
            self.page.get_by_role("button", name="Clear All").click()
            self.page.wait_for_timeout(6000)
            self.page.locator(self.HIDE_CHAT_HISTORY_BUTTON).click()
            self.page.wait_for_load_state('networkidle')
            self.page.wait_for_timeout(2000)

    def close_chat_history(self):
        self.page.locator(self.HIDE_CHAT_HISTORY_BUTTON).click()
        self.page.wait_for_load_state('networkidle')
        self.page.wait_for_timeout(2000)
    
   

    def click_send_button(self):
        # Click on send button in question area
        self.page.locator(self.SEND_BUTTON).click()
        self.page.locator(self.STOP_GENERATING_LABEL).wait_for(state='hidden')

    def validate_next_meeting_date_time(self):
        # validate next meeting date and time in side panel with response data
        date_times = self.page.locator(self.SIDE_PANEL_NEXT_MEETING_DETAILS)
        sidepanel_raw_datetime =""
        for i in range(date_times.count()):
            date_time = date_times.nth(i)
            text = date_time.inner_text()
            sidepanel_raw_datetime = sidepanel_raw_datetime + " " + text

        response_raw_datetime = self.page.locator(self.ANSWER_TEXT).text_content()
        BasePage.compare_raw_date_time(self,response_raw_datetime,sidepanel_raw_datetime)


    def click_on_show_chat_history_button(self):
        self.page.wait_for_selector(self.SHOW_CHAT_HISTORY_BUTTON)
        self.page.locator(self.SHOW_CHAT_HISTORY_BUTTON).click()
        self.page.wait_for_timeout(1000)        

    def click_send_button_for_chat_history_response(self):
        # Click on send button in question area
        self.page.locator(self.SEND_BUTTON).click() 


    def click_clear_chat_icon(self):
        # Click on clear chat icon in question area
        if self.page.locator(self.USER_CHAT_MESSAGE).is_visible():
            self.page.locator(self.CLEAR_CHAT_ICON).click()

    def click_hide_chat_history_button(self):
        # Click on hide chat history button in question area
        self.page.locator(self.HIDE_CHAT_HISTORY_BUTTON).click()

    def has_reference_link(self):
        # Get all assistant messages
        assistant_messages = self.page.locator("div.chat-message.assistant")
        last_assistant = assistant_messages.nth(assistant_messages.count() - 1)

        # Use XPath properly by prefixing with 'xpath='
        reference_links = last_assistant.locator("xpath=.//span[@role='button' and contains(@class, 'citationContainer')]")
        return reference_links.count() > 0