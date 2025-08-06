import logging
import time
import pytest
from config.constants import *
from pages.homePage import HomePage
import io

logger = logging.getLogger(__name__)

# ----------------- Part A: Functional Tests -----------------

def validate_home_and_client(home):
    assert homepage_title == home.page.locator(home.HOME_PAGE_TITLE).text_content()
    home.select_a_client(client_name)
    assert client_name == home.page.locator(home.SELECTED_CLIENT_NAME_LABEL).text_content()

def delete_chat_history_during_response(home):
    home.delete_chat_history()
    # home.close_chat_history()
    

def validate_client_absence(home):
    _validate_client_info_absence(home, golden_path_question7)

functional_test_cases = [
    ("Validate homepage is loaded and select client", validate_home_and_client),
    ("Validate delete chat history", delete_chat_history_during_response),
]

@pytest.mark.parametrize("desc, action", functional_test_cases, ids=[x[0] for x in functional_test_cases])
def test_functional_flows(login_logout, desc, action, request):
    page = login_logout
    home_page = HomePage(page)
    home_page.page = page

    log_capture = io.StringIO()
    handler = logging.StreamHandler(log_capture)
    logger.addHandler(handler)

    logger.info(f"Running step: {desc}")
    start = time.time()
    try:
        action(home_page)
    finally:
        duration = time.time() - start
        logger.info(f"Execution Time for '{desc}': {duration:.2f}s")
        logger.removeHandler(handler)
        request.node._report_sections.append(("call", "log", log_capture.getvalue()))

# ----------------- Part B: GP Question Tests -----------------

# GP Questions List
gp_questions = [
    golden_path_question1,
    golden_path_question2,
    golden_path_question3,
    golden_path_question4,
    golden_path_question5
]

# Custom readable test IDs
gp_test_ids = [f"Validate response for prompt: {q[:60]}... " for i, q in enumerate(gp_questions)]

def _validate_golden_path_response(home, question):
    home.enter_a_question(question)
    home.click_send_button()
    home.validate_response_status()
    response_text = home.page.locator(home.ANSWER_TEXT)
    last_response = response_text.nth(response_text.count() - 1).text_content()
    assert last_response != invalid_response, f"Incorrect response for: {question}"
    assert last_response != "Chart cannot be generated.", f"Chart error for: {question}"

    if home.has_reference_link():
        logger.info("Citation link found. Opening citation.")
        home.click_reference_link_in_response()
        logger.info("Closing citation.")
        home.close_citation()

    home.click_on_show_chat_history_button()
    home.close_chat_history()
    

def _validate_client_info_absence(home, question):
    home.enter_a_question(question)
    home.click_send_button()
    home.validate_response_status()
    response_text = home.page.locator(home.ANSWER_TEXT).nth(
        home.page.locator(home.ANSWER_TEXT).count() - 1
    ).text_content().lower()
    assert "arun sharma" not in response_text, "Other client information appeared in response."
    assert client_name.lower() not in response_text, f"Client name '{client_name}' appeared in response."

@pytest.mark.parametrize("question", gp_questions, ids=gp_test_ids)
def test_gp_questions_individual(login_logout, question, request):
    page = login_logout
    home = HomePage(page)
    home.page = page

    log_capture = io.StringIO()
    handler = logging.StreamHandler(log_capture)
    logger.addHandler(handler)

    logger.info(f"Running Golden Path test for: {question}")
    start = time.time()
    try:
        _validate_golden_path_response(home, question)
    finally:
        duration = time.time() - start
        logger.info(f"Execution Time for GP Question: {duration:.2f}s")
        logger.removeHandler(handler)
        request.node._report_sections.append(("call", "log", log_capture.getvalue()))
