import { useContext, useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Dialog, Stack, TextField, Pivot, PivotItem } from '@fluentui/react';
import { CopyRegular } from '@fluentui/react-icons';
import BellToggle from '../../assets/BellToggle.svg';
import { CosmosDBStatus } from '../../api';
import TeamAvatar from '../../assets/TeamAvatar.svg';
import Illustration from '../../assets/Illustration.svg'
import { HistoryButton, ShareButton } from '../../components/common/Button';
import Cards from '../../components/Cards/Cards';
import PowerBIChart from '../../components/PowerBIChart/PowerBIChart';
import Chat from '../chat/Chat';  // Import the Chat component
import { AppStateContext } from '../../state/AppProvider';
import { getUserInfo,getpbi } from '../../api'
import { User } from '../../types/User'; 


import welcomeIcon from '../../assets/welcomeIcon.png'
import styles from './Layout.module.css';



const Layout = () => {
  // const [contentType, setContentType] = useState<string | null>(null);
  // const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState<boolean>(false);
  const [isSharePanelOpen, setIsSharePanelOpen] = useState<boolean>(false);
  const [copyClicked, setCopyClicked] = useState<boolean>(false);
  const [copyText, setCopyText] = useState<string>('Copy URL');
  const [shareLabel, setShareLabel] = useState<string | undefined>('Share');
  const [hideHistoryLabel, setHideHistoryLabel] = useState<string>('Hide chat history');
  const [showHistoryLabel, setShowHistoryLabel] = useState<string>('Show chat history');
  const appStateContext = useContext(AppStateContext);
  const ui = appStateContext?.state.frontendSettings?.ui;

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showWelcomeCard, setShowWelcomeCard] = useState<boolean>(true);
  const [name, setName] = useState<string>('')

  const [pbiurl, setPbiUrl] = useState<string>('')

  useEffect(() => {
    const fetchpbi = async () => {
      try {
        const pbiurl = await getpbi();
        setPbiUrl(pbiurl); // Set the power bi url
      } catch (error) {
        console.error('Error fetching PBI url:', error);
      }
    };

    fetchpbi();
  }, []);

  const handleCardClick = (user: User) => {
    setSelectedUser(user);
    setShowWelcomeCard(false);
  };

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
    getUserInfo().then((res) => {
      console.log('User info: ', res)
      const name: string = res[0].user_claims.find((claim: any) => claim.typ === 'name')?.val ?? ''
      setName(name)
    }).catch((err) => {
      console.error('Error fetching user info: ', err)
    })
  }, [])

  const calculateChartUrl = (user: User) => {
    const filter = `&filter=clients/Email eq '${user.ClientEmail}'&navContentPaneEnabled=false`;
    return `${pbiurl}${filter}`;
  };

  

  return (
    <div className={styles.layout}>
      <header className={styles.header} role={'banner'}>
        <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
          <Stack horizontal verticalAlign="center">
            <img src={ui?.logo ? ui.logo : TeamAvatar} className={styles.headerIcon} aria-hidden="true" alt="" />
            <Link to="/" className={styles.headerTitleContainer}>
              <h1 className={styles.headerTitle}>{ui?.title}</h1>
            </Link>
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
   
    <div className={styles.ContentContainer}>
      <div className={styles.cardsColumn}>
        <div className={styles.selectClientHeading}>
        <img src={BellToggle} className={styles.BellToggle} alt="BellToggle"/>
        <h4 className={styles.meeting}>Upcoming meetings</h4>
        </div>
        
        <Cards onCardClick={handleCardClick} />
      </div>
      <div className={styles.contentColumn}>
        {!selectedUser && showWelcomeCard ? (
        <div className={styles.contentColumn}>
          <div className={styles.mainPage}>
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeCardContent}>
            <div className={styles.welcomeCardIcon}>
              <img src={welcomeIcon} alt="Icon" className={styles.icon} />
            </div>
            <h3 className={styles.welcomeTitle}>Select a client</h3>
            <p className={styles.welcomeText}>You can ask questions about their portfolio details and previous conversations or view their profile.</p>
            </div>
          </div>
          <div className={styles.welcomeMessage}>
            <img src={Illustration} alt="Illustration" className={styles.illustration} />
            <h1>Welcome Back, {name}</h1>
          </div>
          </div>
      </div>
        ) : (
          
           <div className={styles.pivotContainer}>
            {selectedUser && (
            <div className={styles.selectedClient}>
          Client selected: <span className={styles.selectedName}>{selectedUser ? selectedUser.ClientName : 'None'}</span> 
        </div>
            )}
          <Pivot defaultSelectedKey="chat">
            <PivotItem headerText="Chat" itemKey="chat">
              <Chat />
            </PivotItem>
            <PivotItem headerText="Client 360 Profile" itemKey="profile">
              <PowerBIChart chartUrl={calculateChartUrl(selectedUser)} />
            </PivotItem>
          </Pivot>
       </div>
        )}

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
        }}>
        <Stack horizontal verticalAlign="center" style={{ gap: '8px' }}>
          <TextField className={styles.urlTextBox} defaultValue={window.location.href} readOnly />
          <div
            className={styles.copyButtonContainer}
            role="button"
            tabIndex={0}
            aria-label="Copy"
            onClick={handleCopyClick}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ' ? handleCopyClick() : null)}>
            <CopyRegular className={styles.copyButton} />
            <span className={styles.copyButtonText}>{copyText}</span>
          </div>
        </Stack>
      </Dialog>
    </div>
  );
};

export default Layout;
