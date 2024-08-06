import React, { useState, useEffect, useContext } from 'react';
import UserCard from '../UserCard/UserCard';
import styles from './Cards.module.css';
import { getUsers, selectUser } from '../../api/api';
import { AppStateContext } from '../../state/AppProvider';
import { User } from '../../types/User';

interface CardsProps {
  onCardClick: (user: User) => void;
}

const Cards: React.FC<CardsProps> = ({ onCardClick }) => {
  const [users, setUsers] = useState<User[]>([]);
  const appStateContext = useContext(AppStateContext);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersData = await getUsers();
        setUsers(usersData); // Set the users state
        // console.log('Fetched users:', usersData); 
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  if (users.length === 0) return <div>Loading...</div>;

  const handleCardClick = async (user: User) => {
    if (!appStateContext) {
      console.error('App state context is not defined');
      return;
    }
    if (user.ClientId) {
      appStateContext.dispatch({ type: 'UPDATE_CLIENT_ID', payload: user.ClientId.toString() });
      setSelectedClientId(user.ClientId.toString());
      console.log('User clicked:', user);
      console.log('Selected ClientId:', user.ClientId.toString());
      onCardClick(user);
   
  } else {
    console.error('User does not have a ClientId and clientName:', user);
  }
  };

  return (
    <div className={styles.cardContainer}>
      <div className={styles.section}>
        {users.slice(1).map((user) => (
          <div key={user.ClientId} className={styles.cardWrapper}>
            <UserCard
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default Cards;
