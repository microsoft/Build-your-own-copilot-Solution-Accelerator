from base.base import BasePage


class DraftPage(BasePage):
    DRAFT_ICON = "//button[@aria-label='button']//following-sibling::span[text()='Draft']"
    DRAFT_PAGE_TITLE = "//div/h2[text()='Draft grant proposal']"
    TOPIC_TEXT_AREA = "//textarea[contains(@placeholder,'Type a new topic')]"
    GENERATE_BUTTON = "//button[text()='Generate']"
    PROJECT_SUMMARY_LABEL = "//span[text()='Project Summary']"
    PROJECT_NARRATIVE_LABEL = "//span[text()='Project Narrative']"
    RESOURCE_SECTION_LABEL = "//span[text()='Facilities & Resources']"
    RESEARCH_PLAN_LABEL = "//span[text()='Research Plan']"
    DRAFT_PAGE_WORKING_ON_IT_POP_UP="//h2[contains(text(),'Working on it')]"
    DRAFT_ORGANIZATION_NAME="//input[@value='Contoso']"
    DRAFT_AURTHOR_NAME="//input[@placeholder='Name']"



    def __init__(self, page):
        self.page = page

    def click_draft_icon(self):
        # click on Articles icon on welcome page
        self.page.locator(self.DRAFT_ICON).click()

    def enter_topic_text(self,text):
        # enter the topic text
        self.page.locator(self.TOPIC_TEXT_AREA).fill(text)
        self.page.wait_for_timeout(2000)

    def click_generate_button(self):
        # click on Generate button in Topic
        self.page.locator(self.GENERATE_BUTTON).click()
        self.page.locator(self.DRAFT_PAGE_WORKING_ON_IT_POP_UP).wait_for(state='hidden')

    def scroll_end_page(self):
        # scroll down to last section in Draft page
        BasePage.scroll_into_view(self,self.page.locator(self.RESEARCH_PLAN_LABEL))
        self.page.wait_for_timeout(2000)