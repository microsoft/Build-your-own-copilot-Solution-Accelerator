from unittest.mock import patch

from backend.common.event_utils import track_event_if_configured


@patch("backend.common.event_utils.track_event")
@patch("backend.common.event_utils.config")
@patch("backend.common.event_utils.logging")
def test_track_event_when_configured(mock_logging, mock_config, mock_track_event):
    # Setup
    mock_config.APPLICATIONINSIGHTS_CONNECTION_STRING = "mock_connection_string"
    event_name = "test_event"
    event_data = {"key": "value"}

    # Execute
    track_event_if_configured(event_name, event_data)

    # Verify
    mock_track_event.assert_called_once_with(event_name, event_data)
    mock_logging.warning.assert_not_called()


@patch("backend.common.event_utils.track_event")
@patch("backend.common.event_utils.config")
@patch("backend.common.event_utils.logging")
def test_track_event_when_not_configured(mock_logging, mock_config, mock_track_event):
    # Setup
    mock_config.APPLICATIONINSIGHTS_CONNECTION_STRING = None
    event_name = "test_event"
    event_data = {"key": "value"}

    # Execute
    track_event_if_configured(event_name, event_data)

    # Verify
    mock_track_event.assert_not_called()
    mock_logging.warning.assert_called_once_with(
        f"Skipping track_event for {event_name} as Application Insights is not configured"
    )


@patch("backend.common.event_utils.track_event")
@patch("backend.common.event_utils.config")
@patch("backend.common.event_utils.logging")
def test_track_event_attribute_error(mock_logging, mock_config, mock_track_event):
    # Setup
    mock_config.APPLICATIONINSIGHTS_CONNECTION_STRING = "mock_connection_string"
    mock_track_event.side_effect = AttributeError(
        "ProxyLogger has no attribute 'resource'"
    )
    event_name = "test_event"
    event_data = {"key": "value"}

    # Execute
    track_event_if_configured(event_name, event_data)

    # Verify
    mock_track_event.assert_called_once_with(event_name, event_data)
    mock_logging.warning.assert_called_once_with(
        "ProxyLogger error in track_event: ProxyLogger has no attribute 'resource'"
    )


@patch("backend.common.event_utils.track_event")
@patch("backend.common.event_utils.config")
@patch("backend.common.event_utils.logging")
def test_track_event_general_exception(mock_logging, mock_config, mock_track_event):
    # Setup
    mock_config.APPLICATIONINSIGHTS_CONNECTION_STRING = "mock_connection_string"
    mock_track_event.side_effect = Exception("Something went wrong")
    event_name = "test_event"
    event_data = {"key": "value"}

    # Execute
    track_event_if_configured(event_name, event_data)

    # Verify
    mock_track_event.assert_called_once_with(event_name, event_data)
    mock_logging.warning.assert_called_once_with(
        "Error in track_event: Something went wrong"
    )
