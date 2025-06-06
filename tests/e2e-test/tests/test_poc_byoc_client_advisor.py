from config.constants import *
from pages.homePage import HomePage


# def test_chatbot_responds_with_upcoming_meeting_schedule_date(login_logout):
#     page = login_logout
#     home_page = HomePage(page)
#     # validate page title
#     assert homepage_title == page.locator(home_page.HOME_PAGE_TITLE).text_content()
#     # select a client
#     home_page.select_a_client(client_name)
#     # validate selected client name
#     assert client_name == page.locator(home_page.SELECTED_CLIENT_NAME_LABEL).text_content()
#     # ask a question
#     home_page.enter_a_question(next_meeting_question)
#     # click send button
#     home_page.click_send_button()
#     # Validate response status code
#     home_page.validate_response_status()
#     # validate the upcoming meeting date-time in both side panel and response
#     home_page.validate_next_meeting_date_time()

def test_save_chat_confirmation_popup(login_logout):
    page = login_logout
    home_page = HomePage(page)
    # validate page title
    assert homepage_title == page.locator(home_page.HOME_PAGE_TITLE).text_content()
    # select a client
    home_page.select_a_client(client_name)
    # validate selected client name
    assert client_name == page.locator(home_page.SELECTED_CLIENT_NAME_LABEL).text_content()
    # clear the chat if any
    home_page.click_clear_chat_icon()
    # ask a question
    home_page.enter_a_question(golden_path_question1)
    # click send button
    home_page.click_send_button()
    # Validate response status code
    home_page.validate_response_status()
    #click on the plus button
    home_page.click_on_save_chat_plus_icon()
    assert page.locator(home_page.SAVE_CHAT_CONFIRMATION_POPUPTEXT).is_visible()

def test_delete_chat_history_during_response(login_logout):
    page = login_logout
    home_page = HomePage(page)
    # validate page title
    assert homepage_title == page.locator(home_page.HOME_PAGE_TITLE).text_content()
    # select a client
    home_page.select_a_client(client_name)
    # validate selected client name
    assert client_name == page.locator(home_page.SELECTED_CLIENT_NAME_LABEL).text_content()
    # ask a question
    home_page.enter_a_question(golden_path_question1)
    # click send button
    home_page.click_send_button()
    #click on the plus button
    home_page.click_on_save_chat_plus_icon()
    assert page.locator(home_page.SAVE_CHAT_CONFIRMATION_POPUPTEXT).is_visible()
    #click on show chat history button
    home_page.click_on_show_chat_history_button()
    #click on saved chat history
    home_page.click_on_saved_chat()
    #ask the question 
    home_page.enter_a_question(golden_path_question1)
    #click on click_send_button_for_chat_history_response 
    home_page.click_send_button_for_chat_history_response()
    # validate the delete icon disabled
    assert page.locator(home_page.SHOW_CHAT_HISTORY_DELETE_ICON).is_disabled()
    # click on  hide chat history button
    home_page.click_hide_chat_history_button()
    # clear the chat
    home_page.click_clear_chat_icon()
    
def test_golden_path_demo_script(login_logout):
    page = login_logout
    home_page = HomePage(page)
    # validate page title
    assert homepage_title == page.locator(home_page.HOME_PAGE_TITLE).text_content()
    # select a client
    home_page.select_a_client(client_name)
    # validate selected client name
    assert client_name == page.locator(home_page.SELECTED_CLIENT_NAME_LABEL).text_content()
    # ask a question
    home_page.enter_a_question(golden_path_question1)
    # click send button
    home_page.click_send_button()
    # Validate response status code
    home_page.validate_response_status()
    response_text = page.locator(home_page.ANSWER_TEXT)
    # validate the response
    assert response_text.nth(response_text.count()-1).text_content() != invalid_response,"Incorrect response for question: "+golden_path_question1
    # ask a question
    home_page.enter_a_question(golden_path_question2)
    # click send button
    home_page.click_send_button()
    # Validate response status code
    home_page.validate_response_status()
    # validate the response
    assert response_text.nth(response_text.count() - 1).text_content() != invalid_response,"Incorrect response for question: "+golden_path_question2
    # ask a question
    home_page.enter_a_question(golden_path_question3)
    # click send button
    home_page.click_send_button()
    # Validate response status code
    home_page.validate_response_status()
    # validate the response
    assert response_text.nth(response_text.count() - 1).text_content() != invalid_response,"Incorrect response for question: "+golden_path_question3
    # ask a question
    home_page.enter_a_question(golden_path_question4)
    # click send button
    home_page.click_send_button()
    # Validate response status code
    home_page.validate_response_status()
    # validate the response
    assert response_text.nth(response_text.count() - 1).text_content() != invalid_response,"Incorrect response for question: "+golden_path_question4
    # ask a question
    home_page.enter_a_question(golden_path_question5)
    # click send button
    home_page.click_send_button()
    # Validate response status code
    home_page.validate_response_status()
    # validate the response
    assert response_text.nth(response_text.count() - 1).text_content() != invalid_response,"Incorrect response for question: "+golden_path_question5
    # # ask a question
    # home_page.enter_a_question(golden_path_question6)
    # # click send button
    # home_page.click_send_button()
    # # Validate response status code
    # home_page.validate_response_status()
    # # validate the response
    # assert response_text.nth(response_text.count() - 1).text_content() != invalid_response,"Incorrect response for question: "+golden_path_question6
    # ask a question
    home_page.enter_a_question(golden_path_question7)
    # click send button
    home_page.click_send_button()
    # Validate response status code
    home_page.validate_response_status()
    # validate the response
    assert (response_text.nth(response_text.count() - 1).text_content().lower()).find("arun sharma") == -1,"Other client information in response for client: "+client_name
    assert (response_text.nth(response_text.count() - 1).text_content().lower()).find(client_name) == -1,"Response is generated for selected client "+client_name+" even client name is different in question: "+golden_path_question7