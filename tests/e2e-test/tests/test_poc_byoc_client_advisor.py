import logging
import time
import pytest
from config.constants import *
from pages.homePage import HomePage

logger = logging.getLogger(__name__)

def validate_home_and_client(home):
    assert homepage_title == home.page.locator(home.HOME_PAGE_TITLE).text_content()
    home.select_a_client(client_name)
    assert client_name == home.page.locator(home.SELECTED_CLIENT_NAME_LABEL).text_content()

def save_chat_confirmation_popup(home):
    home.click_clear_chat_icon()
    home.enter_a_question(golden_path_question1)
    home.click_send_button()
    home.validate_response_status()
    home.click_on_save_chat_plus_icon()
    assert home.page.locator(home.SAVE_CHAT_CONFIRMATION_POPUPTEXT).is_visible()

def delete_chat_history_during_response(home):
    home.enter_a_question(golden_path_question1)
    home.click_send_button()
    home.click_on_save_chat_plus_icon()
    assert home.page.locator(home.SAVE_CHAT_CONFIRMATION_POPUPTEXT).is_visible()
    home.click_on_show_chat_history_button()
    home.click_on_saved_chat()
    home.enter_a_question(golden_path_question1)
    home.click_send_button_for_chat_history_response()
    assert home.page.locator(home.SHOW_CHAT_HISTORY_DELETE_ICON).is_disabled()
    home.click_hide_chat_history_button()
    home.click_clear_chat_icon()

def golden_path_full_demo(home):
    _validate_golden_path_response(home, golden_path_question1)
    _validate_golden_path_response(home, golden_path_question2)
    _validate_golden_path_response(home, golden_path_question3)
    _validate_golden_path_response(home, golden_path_question4)
    _validate_golden_path_response(home, golden_path_question5)
    _validate_client_info_absence(home, golden_path_question7)

# Define test steps and actions
test_cases = [
    ("Validate homepage and select client", validate_home_and_client),
    ("Save chat confirmation popup", save_chat_confirmation_popup),
    ("Delete chat history during response", delete_chat_history_during_response),
    ("Golden path full demo", golden_path_full_demo),
]

# Create readable test IDs
test_ids = [f"{i+1:02d}. {desc}" for i, (desc, _) in enumerate(test_cases)]

def _validate_golden_path_response(home, question):
    home.enter_a_question(question)
    home.click_send_button()
    home.validate_response_status()
    response_text = home.page.locator(home.ANSWER_TEXT)
    assert response_text.nth(response_text.count() - 1).text_content() != invalid_response, \
        f"Incorrect response for question: {question}"

def _validate_client_info_absence(home, question):
    home.enter_a_question(question)
    home.click_send_button()
    home.validate_response_status()
    response_text = home.page.locator(home.ANSWER_TEXT).nth(home.page.locator(home.ANSWER_TEXT).count() - 1).text_content().lower()
    assert "arun sharma" not in response_text, "Other client information appeared in response."
    assert client_name.lower() not in response_text, f"Client name '{client_name}' should not be in response for question: {question}"

@pytest.mark.parametrize("desc, action", test_cases, ids=test_ids)
def test_home_page_cases(login_logout, desc, action, request):
    """
    Parametrized test for home page scenarios including chat flows and validations.
    """
    page = login_logout
    home_page = HomePage(page)
    home_page.page = page  # Required for locator access in helper functions
    logger.info(f"Running step: {desc}")

    start = time.time()
    action(home_page)
    end = time.time()

    duration = end - start
    logger.info(f"Execution Time for '{desc}': {duration:.2f}s")
    request.node._report_sections.append(("call", "log", f"Execution time: {duration:.2f}s"))
