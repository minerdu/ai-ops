import { create } from 'zustand';

const useStore = create((set, get) => ({
  // --- Customer State ---
  customers: [],
  allMessages: {}, // Maps customerId -> Message Array
  isLoadingCustomers: true,
  isLoadingMessages: false,

  selectedCustomerId: null,
  searchTerm: '',
  activeFilter: 'all',
  activeWorkspace: 'main', // 'main', 'sub_1', 'sub_2'

  setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),

  fetchCustomers: async () => {
    set({ isLoadingCustomers: true });
    try {
      const { activeFilter, searchTerm } = get();
      let url = '/api/customers?';
      if (activeFilter !== 'all') url += `filter=${activeFilter}&`;
      if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;
      
      const res = await fetch(url);
      const data = await res.json();
      set({ customers: data, isLoadingCustomers: false });
    } catch (e) {
      console.error(e);
      set({ isLoadingCustomers: false });
    }
  },

  fetchMessages: async (customerId) => {
    set({ isLoadingMessages: true });
    try {
      const res = await fetch(`/api/messages?customerId=${customerId}`);
      const data = await res.json();
      
      set((state) => ({
        allMessages: {
          ...state.allMessages,
          [customerId]: data
        },
        isLoadingMessages: false
      }));
    } catch (e) {
      console.error(e);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (customerId, content, senderType = 'human') => {
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, content, senderType })
      });
      const newMsg = await res.json();
      
      set((state) => {
        const msgs = state.allMessages[customerId] || [];
        return {
          allMessages: {
            ...state.allMessages,
            [customerId]: [...msgs, newMsg]
          }
        };
      });
    } catch (e) {
      console.error(e);
    }
  },

  selectCustomer: (id) => {
    set({ selectedCustomerId: id });
    if (id) {
      get().fetchMessages(id);
    }
  },

  clearSelection: () => {
    set({ selectedCustomerId: null });
  },

  setSearchTerm: (term) => {
    set({ searchTerm: term });
    get().fetchCustomers();
  },
  
  setActiveFilter: (filter) => {
    set({ activeFilter: filter });
    get().fetchCustomers();
  },

  // --- AI Typing Status ---
  // Maps conversationId -> { isTyping: bool, messageCount: number, completedCount: number }
  typingStatus: {},
  setTypingStatus: (conversationId, status) => set(state => ({
    typingStatus: {
      ...state.typingStatus,
      [conversationId]: status,
    }
  })),
  clearTypingStatus: (conversationId) => set(state => {
    const newStatus = { ...state.typingStatus };
    delete newStatus[conversationId];
    return { typingStatus: newStatus };
  }),

  // --- UI State ---
  activeMainPanel: 'leads',
  setActiveMainPanel: (panel) => set({ activeMainPanel: panel }),
  sideMenuOpen: false,
  toggleSideMenu: () => set(s => ({ sideMenuOpen: !s.sideMenuOpen })),
  closeSideMenu: () => set({ sideMenuOpen: false }),

  // --- Notifications State ---
  notifications: [],
  fetchNotifications: async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      set({ notifications: data });
    } catch (e) {
      console.error(e);
    }
  },
  markNotificationAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
    }));
  },
}));

// Derived selectors
export const selectSelectedCustomer = (state) => {
  if (!state.selectedCustomerId) return null;
  return state.customers.find(c => c.id === state.selectedCustomerId) || null;
};

export const selectSelectedMessages = (state) => {
  if (!state.selectedCustomerId) return [];
  return state.allMessages[state.selectedCustomerId] || [];
};

export const selectFilteredCustomers = (state) => {
  // Return all loaded customers since filtering is handled in fetch via API in this implementation
  return state.customers;
};

export default useStore;
