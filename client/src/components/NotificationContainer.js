import React from 'react';
import Notification from './Notification';
import './NotificationContainer.css';

function NotificationContainer({ notifications, onRemove }) {
  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
}

export default NotificationContainer;

