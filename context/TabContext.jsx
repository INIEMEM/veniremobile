import React, { createContext, useState, useContext } from 'react';

const TabContext = createContext();

export const TabProvider = ({ children }) => {
  const [activeHomeTab, setActiveHomeTab] = useState("events");
  const [showCreatePlaceModal, setShowCreatePlaceModal] = useState(false);

  return (
    <TabContext.Provider value={{ 
      activeHomeTab, 
      setActiveHomeTab, 
      showCreatePlaceModal, 
      setShowCreatePlaceModal 
    }}>
      {children}
    </TabContext.Provider>
  );
};

export const useTabContext = () => {
  const context = useContext(TabContext);
  if (!context) {
    // Safe fallback — prevents crash if used outside TabProvider (e.g. during APK cold start)
    return {
      activeHomeTab: "events",
      setActiveHomeTab: () => {},
      showCreatePlaceModal: false,
      setShowCreatePlaceModal: () => {},
    };
  }
  return context;
};
