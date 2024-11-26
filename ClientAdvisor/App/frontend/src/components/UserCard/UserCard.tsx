import React, {useState} from 'react';
import { Text } from '@fluentui/react';
import { Icon } from '@fluentui/react/lib/Icon';

import styles from  './UserCard.module.css';
import { User } from '../../types/User';

interface UserCardProps {
  ClientId: number;
  ClientName: string;
  NextMeeting: string;
  AssetValue: string;
  LastMeeting: string;
  NextMeetingTime: string;
  NextMeetingEndTime: string;
  ClientSummary: string;
  onCardClick: () => void;
  isSelected: boolean;
  isNextMeeting: boolean;
  LastMeetingStartTime: string;
  LastMeetingEndTime: string;
  chartUrl: string;
}

export const UserCard: React.FC<UserCardProps> = ({ 
  ClientId,
  ClientName,
  NextMeeting,
  NextMeetingTime,
  NextMeetingEndTime,
  AssetValue,
  LastMeeting,
  LastMeetingStartTime,
  LastMeetingEndTime,
 ClientSummary,
  onCardClick,
  isSelected,
  isNextMeeting,
  chartUrl,
}) => {
    const [showMore, setShowMore] = useState(false);

    const handleShowMoreClick = (event: React.MouseEvent | React.KeyboardEvent) => {
      event.stopPropagation(); // Prevent the onCardClick from triggering
      setShowMore(!showMore);
    };  

  return (
    <div className={styles.cardContainer}>
    <div tabIndex={0} className={`${styles.userInfo} ${isSelected ? styles.selected : ''}`} onClick={onCardClick} onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();  // Prevent the default action like scrolling.
      onCardClick();  // Call the same function as onClick.
    }
  }}>
      <div className={styles.clientName}>{ClientName}</div>
      <div className={styles.nextMeeting}><span><Icon iconName='Calendar' className={styles.calendarIcon} /></span>{NextMeeting}</div>
      <div className={styles.nextMeeting}><span><Icon iconName='Clock' className={styles.calendarIcon} /></span>{NextMeetingTime} - {NextMeetingEndTime}</div>
    </div>
      
      {showMore && (
        <>
        <div className={styles.morestyles}>
          <div style={{ fontWeight: 'bold', fontSize:'16px', marginTop:'0', display: 'block', marginBottom: '10px', }}>Asset Value</div>
          <div style={{ fontSize:'14px', display: 'block' }}>${AssetValue}</div> <br />
          <div style={{ fontWeight: 'bold', fontSize:'16px', marginTop:'0', marginBottom: '10px' }}>Previous Meeting</div>
          <div style={{ fontSize:'14px', display: 'block' }}>{LastMeeting}</div> 
          <div className={styles.nextMeeting}>{LastMeetingStartTime} - {LastMeetingEndTime}</div>
          <div style={{fontSize:'14px', fontWeight:'400', display: 'block' }}>{ClientSummary}</div>
          </div>
        </>
      )}
    
  
  
  <div tabIndex={0} className={styles.showBtn} onClick={handleShowMoreClick} onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();  // Prevent the default action like scrolling.
      handleShowMoreClick(e);  // Call the same function as onClick.
    }
  }}>
  {showMore ? 'Less details' : 'More details'}
</div>
</div>
);
};

