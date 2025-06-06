from pages.draftPage import DraftPage
from pages.grantsPage import GrantsPage
from pages.articlesPage import ArticlesPage
from config.constants import *


def test_articles_page_works_properly(login_logout):
    page = login_logout
    articles_page = ArticlesPage(page)
    # click on Articles tab
    articles_page.click_articles_icon()
    # validate Articles page title to be visible
    page.wait_for_selector(articles_page.ARTICLES_PAGE_TITLE)
    # enter a question in Articles
    articles_page.enter_a_question(articles_question1)
    # click on send button
    articles_page.click_send_button()
    # verify the status response code
    articles_page.validate_response_status(index_name_articles)
    # click on expand on reference in response
    articles_page.click_expand_reference_in_response()
    # click on reference link in response
    articles_page.click_reference_link_in_response()
    # click on Favorite button in References section
    articles_page.click_favorite_button()
    # validate Favorite added in Favorite section
    page.wait_for_selector(articles_page.REMOVE_FAVORITE_ICON)
    # close Favorites section
    articles_page.close_favorite_section()
    # close Reference section
    articles_page.close_reference_section()
    # enter a question in Articles
    articles_page.enter_a_question(articles_question2)
    # click on send button
    articles_page.click_send_button()
    # verify the status response code
    articles_page.validate_response_status(index_name_articles)
    # click on expand on reference in response
    articles_page.click_expand_reference_in_response()
    # click on Grants tab
    grants_page = GrantsPage(page)
    grants_page.click_grants_icon()
    # click on Articles tab
    articles_page.click_articles_icon()
    # verify the chat history is available in Articles page
    assert articles_page.history_question_text() == articles_question1

def test_grants_page_works_properly(login_logout):
    page = login_logout
    grants_page = GrantsPage(page)
    # click on Grants tab
    grants_page.click_grants_icon()
    # validate Grants page title to be visible
    page.wait_for_selector(grants_page.GRANTS_PAGE_TITLE)
    # enter a question in Grants
    grants_page.enter_a_question(grants_question1)
    # click on send button
    grants_page.click_send_button()
    # verify the status response code
    grants_page.validate_response_status(index_name_grants)
    # click on expand on reference in response
    grants_page.click_expand_reference_in_response()
    # click on reference link in response
    grants_page.click_reference_link_in_response()
    # click on Favorite button in References section
    grants_page.click_favorite_button()
    # validate Favorite added in Favorite section
    page.wait_for_selector(grants_page.REMOVE_FAVORITE_ICON)
    # close Favorites section
    grants_page.close_favorite_section()
    # close Reference section
    grants_page.close_reference_section()
    # enter a question in Grants page
    grants_page.enter_a_question(grants_question2)
    # click on send button
    grants_page.click_send_button()
    # verify the status response code
    grants_page.validate_response_status(index_name_grants)
    # click on expand on reference in response
    grants_page.click_expand_reference_in_response()
    # click on Articles tab
    articles_page = ArticlesPage(page)
    articles_page.click_articles_icon()
    # click on Grants tab
    grants_page.click_grants_icon()
    # verify the chat history is available in Grants page
    assert grants_page.history_question_text() == grants_question1

def test_draft_page_generates_content(login_logout):
    page = login_logout
    draft_page = DraftPage(page)
    # click on Draft tab
    draft_page.click_draft_icon()
    # validate Draft page title to be visible
    page.wait_for_selector(draft_page.DRAFT_PAGE_TITLE)
    # Validate the Research Plan section is visible
    assert page.locator(draft_page.RESEARCH_PLAN_LABEL).is_visible()
    # Validate Project Summary section is visible
    assert page.locator(draft_page.PROJECT_SUMMARY_LABEL).is_visible()
    # Validate Project Facilities & Resources is visible
    assert page.locator(draft_page.RESOURCE_SECTION_LABEL).is_visible()
    # Validate Project Narrative is visible
    assert page.locator(draft_page.PROJECT_NARRATIVE_LABEL).is_visible()
    # Enter Topic text
    draft_page.enter_topic_text(draft_topic_text)
    # Click Generate button
    draft_page.click_generate_button()
    # Scroll down the end of the page
    draft_page.scroll_end_page()
    # Validate Project Narrative response status
    draft_page.validate_draft_response_status("Project Narrative",draft_topic_text)
    # Validate Facilities & Resources response status
    draft_page.validate_draft_response_status("Facilities & Resources",draft_topic_text)
    # Validate Research Plan response status
    draft_page.validate_draft_response_status("Research Plan",draft_topic_text)
    # Validate Project Summary response status
    draft_page.validate_draft_response_status("Project Summary",draft_topic_text)
    page.keyboard.press('F5',delay=1000)
    page.reload()

def test_golden_path_demo_script(login_logout):
    page = login_logout
    articles_page = ArticlesPage(page)
    # click on Articles tab
    articles_page.click_articles_icon()
    # validate Articles page title to be visible
    page.wait_for_selector(articles_page.ARTICLES_PAGE_TITLE)
    # enter a question in Articles
    articles_page.enter_a_question(articles_question1)
    # click on send button
    articles_page.click_send_button()
    # verify the status response code
    articles_page.validate_response_status(index_name_articles)
    # click on expand on reference in response
    articles_page.click_expand_reference_in_response()
    # click on reference link in response
    articles_page.click_reference_link_in_response()
    # click on Favorite button in References section
    articles_page.click_favorite_button()
    # validate Favorite added in Favorite section
    page.wait_for_selector(articles_page.REMOVE_FAVORITE_ICON)
    # close Favorites section
    articles_page.close_favorite_section()
    # close Reference section
    articles_page.close_reference_section()
    # enter a question in Articles
    articles_page.enter_a_question(articles_question2)
    # click on send button
    articles_page.click_send_button()
    # verify the status response code
    articles_page.validate_response_status(index_name_articles)
    # click on expand on reference in response
    articles_page.click_expand_reference_in_response()
    # click on Grants tab
    grants_page = GrantsPage(page)
    grants_page.click_grants_icon()
    # click on Articles tab
    articles_page.click_articles_icon()
    # verify the chat history is available in Articles page
    assert articles_page.history_question_text() == articles_question1

    #clear the history
    articles_page.clear_history()

    grants_page = GrantsPage(page)
    # click on Grants tab
    grants_page.click_grants_icon()
    # validate Grants page title to be visible
    page.wait_for_selector(grants_page.GRANTS_PAGE_TITLE)
    # enter a question in Grants
    grants_page.enter_a_question(grants_question1)
    # click on send button
    grants_page.click_send_button()
    # verify the status response code
    grants_page.validate_response_status(index_name_grants)
    # click on expand on reference in response
    grants_page.click_expand_reference_in_response()
    # click on reference link in response
    grants_page.click_reference_link_in_response()
    # click on Favorite button in References section
    grants_page.click_favorite_button()
    # validate Favorite added in Favorite section
    page.wait_for_selector(grants_page.REMOVE_FAVORITE_ICON)
    # close Favorites section
    grants_page.close_favorite_section()
    # close Reference section
    grants_page.close_reference_section()
    # enter a question in Grants page
    grants_page.enter_a_question(grants_question2)
    # click on send button
    grants_page.click_send_button()
    # verify the status response code
    grants_page.validate_response_status(index_name_grants)
    # click on expand on reference in response
    grants_page.click_expand_reference_in_response()
    # click on Articles tab
    articles_page = ArticlesPage(page)
    articles_page.click_articles_icon()
    # click on Grants tab
    grants_page.click_grants_icon()
    # verify the chat history is available in Grants page
    assert grants_page.history_question_text() == grants_question1

    #clear the history
    grants_page.clear_history()
    draft_page = DraftPage(page)
    # click on Draft tab
    draft_page.click_draft_icon()
    # validate Draft page title to be visible
    page.wait_for_selector(draft_page.DRAFT_PAGE_TITLE)
    # Enter Topic text
    draft_page.enter_topic_text(draft_topic_text)
    # Click Generate button
    draft_page.click_generate_button()
    # Validate the Research Plan section is visible
    assert page.locator(draft_page.RESEARCH_PLAN_LABEL).is_visible()
    # Validate Project Summary section is visible
    assert page.locator(draft_page.PROJECT_SUMMARY_LABEL).is_visible()
    # Validate Project Facilities & Resources is visible
    assert page.locator(draft_page.RESOURCE_SECTION_LABEL).is_visible()
    # Validate Project Narrative is visible
    assert page.locator(draft_page.PROJECT_NARRATIVE_LABEL).is_visible()
    # Validate the draft organization name is visible
    assert page.locator(draft_page.DRAFT_ORGANIZATION_NAME).is_visible()
    # Validate the draft aurthor name is visible
    assert page.locator(draft_page.DRAFT_AURTHOR_NAME).is_visible()
    # Scroll down the end of the page
    draft_page.scroll_end_page()
    # Validate Project Narrative response status
    draft_page.validate_draft_response_status("Project Narrative",draft_topic_text)
    # Validate Facilities & Resources response status
    draft_page.validate_draft_response_status("Facilities & Resources",draft_topic_text)
    # Validate Research Plan response status
    draft_page.validate_draft_response_status("Research Plan",draft_topic_text)
    # Validate Project Summary response status
    draft_page.validate_draft_response_status("Project Summary",draft_topic_text)


