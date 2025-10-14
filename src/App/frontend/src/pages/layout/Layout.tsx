import { useContext, useEffect, useState } from 'react';
import { Dialog, Stack, TextField, Pivot, PivotItem } from '@fluentui/react';
import { CopyRegular } from '@fluentui/react-icons';
import { CosmosDBStatus } from '../../api';
import TeamAvatar from '../../assets/TeamAvatar.svg';
import Illustration from '../../assets/Illustration.svg';
import { HistoryButton, ShareButton } from '../../components/common/Button';
import Cards from '../../components/Cards/Cards';
// Removed PowerBIChart import as it will no longer be used
// import PowerBIChart from '../../components/PowerBIChart/PowerBIChart';
import Chat from '../chat/Chat'; // Import the Chat component
import { AppStateContext } from '../../state/AppProvider';
import { getUserInfo } from '../../api';
import TickIcon from '../../assets/TickIcon.svg';
import DismissIcon from '../../assets/Dismiss.svg';
import styles from './Layout.module.css';
import { SpinnerComponent } from '../../components/Spinner/SpinnerComponent';

const Layout = () => {
  const [isSharePanelOpen, setIsSharePanelOpen] = useState<boolean>(false);
  const [copyClicked, setCopyClicked] = useState<boolean>(false);
  const [copyText, setCopyText] = useState<string>('Copy URL');
  const [shareLabel, setShareLabel] = useState<string | undefined>('Share');
  const [hideHistoryLabel, setHideHistoryLabel] = useState<string>('Hide chat history');
  const [showHistoryLabel, setShowHistoryLabel] = useState<string>('Show chat history');
  const appStateContext = useContext(AppStateContext);
  const ui = appStateContext?.state.frontendSettings?.ui;
  const [name, setName] = useState<string>('');
  
  const personalName = name ? name.split(' ')[0] : 'there';

  const scrollToSection = (elementId: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    const element = document.getElementById(elementId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenChat = () => scrollToSection('mira-chat');
  const handleOpenCommandCenter = () => scrollToSection('mira-command-center');

  // Removed PowerBI related state and effects
  // const [pbiurl, setPbiUrl] = useState<string>('');
  // useEffect(() => {
  //   const fetchpbi = async () => {
  //     try {
  //       const pbiurl = await getpbi();
  //       setPbiUrl(pbiurl); // Set the power bi url
  //     } catch (error) {
  //       console.error('Error fetching PBI url:', error);
  //     }
  //   }
  //   fetchpbi();
  // }, []);

  const resetClientId = () => {
    appStateContext?.dispatch({ type: 'RESET_CLIENT_ID' });
    handleOpenChat();
  };

  const closePopup = () => {
    setIsVisible(!isVisible);
  };

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 4000); // Popup will disappear after 4 seconds
      return () => clearTimeout(timer); // Cleanup the timer on component unmount
    }
  }, [isVisible]);

  const handleShareClick = () => {
    setIsSharePanelOpen(true);
  };

  const handleSharePanelDismiss = () => {
    setIsSharePanelOpen(false);
    setCopyClicked(false);
    setCopyText('Copy URL');
  };

  const handleCopyClick = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopyClicked(true);
  };

  const handleHistoryClick = () => {
    appStateContext?.dispatch({ type: 'TOGGLE_CHAT_HISTORY' });
  };

  useEffect(() => {
    if (copyClicked) {
      setCopyText('Copied URL');
    }
  }, [copyClicked]);

  useEffect(() => {}, [appStateContext?.state.isCosmosDBAvailable.status]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 480) {
        setShareLabel(undefined);
        setHideHistoryLabel('Hide history');
        setShowHistoryLabel('Show history');
      } else {
        setShareLabel('Share');
        setHideHistoryLabel('Hide chat history');
        setShowHistoryLabel('Show chat history');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    getUserInfo()
      .then(res => {
        const name: string = res[0].user_claims.find((claim: any) => claim.typ === 'name')?.val ?? '';
        setName(name);
      })
      .catch(err => {
        console.error('Error fetching user info: ', err);
      });
  }, []);

  // Removed calculateChartUrl function since it's only used for PowerBI
  // const calculateChartUrl = (user: User) => {
  //   const filter = `&filter=clients/Email eq '${user.ClientEmail}'&navContentPaneEnabled=false`;
  //   return `${pbiurl}${filter}`;
  // };

  return (
    <div className={styles.layout}>
      {isVisible && (
        <div className={styles.popupContainer}>
          <div className={styles.popupContent}>
            <div className={styles.popupText}>
              <div className={styles.headerText}>
                <span className={styles.checkmark}>
                  <img alt="check mark" src={TickIcon} />
                </span>
                Chat saved
                <img alt="close icon" src={DismissIcon} className={styles.closeButton} onClick={closePopup} />
              </div>
              <div className={styles.popupSubtext}>
                <span className={styles.popupMsg}>Your chat history has been saved successfully!</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <SpinnerComponent
        loading={appStateContext?.state.isLoader != undefined ? appStateContext?.state.isLoader : false}
        label="Please wait.....!"
      />
      <div className={styles.cardsColumn} id="mira-command-center">
        <div className={styles.selectClientHeading}>
          <h2 className={styles.meeting}>Mira command center</h2>
        </div>
        <Cards />
      </div>
      <div className={styles.ContentContainer}>
        <header className={styles.header} role={'banner'}>
          <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
            <Stack horizontal verticalAlign="center">
              <img src={ui?.logo ? ui.logo : TeamAvatar} className={styles.headerIcon} aria-hidden="true" alt="" />
              <div
                className={styles.headerTitleContainer}
                onClick={resetClientId}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? resetClientId() : null)}
                tabIndex={-1}
              >
                <h2 className={styles.headerTitle} tabIndex={0}>
                  {ui?.title}
                </h2>
              </div>
            </Stack>
            <Stack horizontal tokens={{ childrenGap: 4 }} className={styles.shareButtonContainer}>
              {appStateContext?.state.isCosmosDBAvailable?.status !== CosmosDBStatus.NotConfigured && (
                <HistoryButton
                  onClick={handleHistoryClick}
                  text={appStateContext?.state?.isChatHistoryOpen ? hideHistoryLabel : showHistoryLabel}
                />
              )}
              {ui?.show_share_button && <ShareButton onClick={handleShareClick} text={shareLabel} />}
            </Stack>
          </Stack>
        </header>
        <div className={styles.contentColumn}>
          <section className={styles.heroSection}>
            <div className={styles.heroContent}>
              <p className={styles.heroGreeting}>Hi {personalName},</p>
              <h1 className={styles.heroTitle}>Mira is ready to organize your day</h1>
              <p className={styles.heroSubtitle}>
                Keep life admin, reminders, and Mukarram’s health updates flowing smoothly. Mira keeps everything in
                one calm place so you can focus on what matters.
              </p>
              <ul className={styles.heroChecklist}>
                <li>Set reminders, to-dos, and calendar events in seconds.</li>
                <li>Track Mukarram’s health notes and medication countdowns.</li>
                <li>Chat with Mira for planning help, summaries, or ideas.</li>
              </ul>
              <div className={styles.heroActions}>
                <button type="button" className={styles.primaryAction} onClick={handleOpenChat}>
                  Open chat
                </button>
                <button type="button" className={styles.secondaryAction} onClick={handleOpenCommandCenter}>
                  View command center
                </button>
              </div>
            </div>
            <div className={styles.heroImage}>
              <img src={Illustration} alt="Mira personal assistant illustration" />
            </div>
          </section>

          <section className={styles.chatSection} id="mira-chat">
            <div className={styles.chatHeader}>
              <h3>Chat with Mira</h3>
              <p>Ask Mira to plan the day, log a note, or answer questions grounded in your workspace.</p>
            </div>
            <div className={styles.pivotContainer}>
              <Pivot defaultSelectedKey="chat" className="tabContainer">
                <PivotItem headerText="Chat" itemKey="chat">
                  <Chat setIsVisible={setIsVisible} />
                </PivotItem>
              </Pivot>
            </div>
          </section>
        </div>
      </div>
      <Dialog
        onDismiss={handleSharePanelDismiss}
        hidden={!isSharePanelOpen}
        styles={{
          main: [
            {
              selectors: {
                ['@media (min-width: 480px)']: {
                  maxWidth: '600px',
                  background: '#FFFFFF',
                  boxShadow: '0px 14px 28.8px rgba(0, 0, 0, 0.24), 0px 0px 8px rgba(0, 0, 0, 0.2)',
                  borderRadius: '8px',
                  maxHeight: '200px',
                  minHeight: '100px'
                }
              }
            }
          ]
        }}
        dialogContentProps={{
          title: 'Share the web app',
          showCloseButton: true
        }}
      >
        <Stack horizontal verticalAlign="center" style={{ gap: '8px' }}>
          <TextField className={styles.urlTextBox} defaultValue={window.location.href} readOnly />
          <div
            className={styles.copyButtonContainer}
            role="button"
            tabIndex={0}
            aria-label="Copy"
            onClick={handleCopyClick}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? handleCopyClick() : null)}
          >
            <CopyRegular className={styles.copyButton} />
            <span className={styles.copyButtonText}>{copyText}</span>
          </div>
        </Stack>
      </Dialog>
    </div>
  );
};

export default Layout;
