
import { callAPI } from '../../services/api/callAPI';
import {
  getICEServersSuccess,
  getCallHistoryStart,
  getCallHistorySuccess,
  getCallHistoryFailure,
} from '../slices/callSlice';

export const fetchICEServers = () => async (dispatch) => {
  try {
    const response = await callAPI.getICEServers();
    dispatch(getICEServersSuccess(response.data));
  } catch (error) {
    console.error('Failed to fetch ICE servers:', error);
  }
};

export const fetchCallHistory = (page = 1) => async (dispatch) => {
  dispatch(getCallHistoryStart());
  try {
    const response = await callAPI.getCallHistory(page);
    dispatch(getCallHistorySuccess(response.data.calls));
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to fetch call history';
    dispatch(getCallHistoryFailure(errorMessage));
  }
};

