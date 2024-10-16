import React, { useState, useEffect, useContext } from 'react';
import {UserCard} from '../UserCard/UserCard';
import styles from './Cards.module.css';
import { getUsers, selectUser } from '../../api';
import { AppStateContext } from '../../state/AppProvider';
import { User } from '../../types/User';
import BellToggle from '../../assets/BellToggle.svg'
import NoMeetings from '../../assets/NoMeetings.svg'

interface CardsProps {
  onCardClick: (user: User) => void;
}

const Cards: React.FC<CardsProps> = ({ onCardClick }) => {
  const [users, setUsers] = useState<User[]>([]);
  const appStateContext = useContext(AppStateContext);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);


  useEffect(() => {
    if(selectedClientId != null && appStateContext?.state.clientId == ''){
      setSelectedClientId('')
    }
  },[appStateContext?.state.clientId]);
  
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true)
        const usersData = await getUsers()
        setUsers(usersData)
        setLoadingUsers(false)
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoadingUsers(false)
      }
    }

    fetchUsers()
  }, [])
  if(loadingUsers){
    return <div className={styles.loadingUsers}>Loading...</div>
  }
  if (users.length === 0)
    return (
      <div className={`${styles.meetingsText} ${styles.noMeetings}`}>
        <img src={NoMeetings} className={styles.noMeetingsIcon} alt="No Meetings found" />
        No meetings have been arranged
      </div>
    )

  const handleCardClick = async (user: User) => {
    if (!appStateContext) {
      console.error('App state context is not defined');
      return;
    }
    if (user.ClientId) {
      appStateContext.dispatch({ type: 'UPDATE_CLIENT_ID', payload: user.ClientId.toString() });
      setSelectedClientId(user.ClientId.toString());
      onCardClick(user);
   
  } else {
    console.error('User does not have a ClientId and clientName:', user);
  }
}
  return (
    <div className={styles.cardContainer}>
      <div className={styles.section}>
        <div>
          <div className={`${styles.meetingsHeader} ${styles.nextMeetingHeader} `}>
            <img src={BellToggle} className={styles.BellToggle} alt="BellToggle" />
            Next meeting
          </div>
          <div className={styles.nextMeetingContent}>
            {users.slice(0, 1).map(user => (
              <UserCard
                key={user.ClientId}
                ClientId={user.ClientId}
                ClientName={user.ClientName}
                NextMeeting={user.NextMeeting}
                NextMeetingTime={user.NextMeetingTime}
                NextMeetingEndTime={user.NextMeetingEndTime}
                AssetValue={user.AssetValue}
                LastMeeting={user.LastMeeting}
                LastMeetingStartTime={user.LastMeetingStartTime}
                LastMeetingEndTime={user.LastMeetingEndTime}
                ClientSummary={user.ClientSummary}
                onCardClick={() => handleCardClick(user)}
                chartUrl={user.chartUrl}
                isSelected={selectedClientId === user.ClientId?.toString()}
                isNextMeeting={false}
              />
            ))}
          </div>
        </div>
        <div>
          <div className={styles.meetingsHeader}>Future meetings</div>
          {users.length === 1 && (
            <div className={`${styles.meetingsText} ${styles.futureMeetings}`}>
              <img src={NoMeetings} className={styles.noMeetingsIcon} alt="No Meetings found" />
              No future meetings have been arranged
            </div>
          )}
          <div className={styles.futureMeetingsContent}>
            {users.slice(1).map(user => (
              <UserCard
                key={user.ClientId}
                ClientId={user.ClientId}
                ClientName={user.ClientName}
                NextMeeting={user.NextMeeting}
                NextMeetingTime={user.NextMeetingTime}
                NextMeetingEndTime={user.NextMeetingEndTime}
                AssetValue={user.AssetValue}
                LastMeeting={user.LastMeeting}
                LastMeetingStartTime={user.LastMeetingStartTime}
                LastMeetingEndTime={user.LastMeetingEndTime}
                ClientSummary={user.ClientSummary}
                onCardClick={() => handleCardClick(user)}
                chartUrl={user.chartUrl}
                isSelected={selectedClientId === user.ClientId?.toString()}
                isNextMeeting={false}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export default Cards;
