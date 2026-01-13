# Error Handling Documentation

The frontend now has comprehensive error handling to prevent crashes and provide better user experience when backend errors occur.

## 🛡️ What Was Added

### 1. **ErrorBoundary Component** (`src/components/ErrorBoundary.tsx`)

Catches any React rendering errors and displays a user-friendly fallback UI instead of crashing the entire application.

**Features:**
- Catches all unhandled React errors
- Shows "Oops... Something went wrong" message
- Displays error details in development mode
- Provides "Return to Home" button to recover
- Can be customized with a custom fallback component

**Usage:**
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 2. **Toast Notification System** (`src/context/ToastContext.tsx`)

Provides non-intrusive error messages that appear in the top-right corner without blocking the UI.

**Features:**
- Three types: error (red), success (green), info (blue)
- Auto-dismisses after 5 seconds
- Can be manually closed
- Supports multiple toasts at once
- Smooth animations

**Usage:**
```tsx
import { useToast } from '../context/ToastContext';

function MyComponent() {
  const { showError, showSuccess, showInfo } = useToast();

  const handleAction = async () => {
    try {
      await someApiCall();
      showSuccess('Action completed!');
    } catch (error) {
      showError('Oops... Something went wrong.');
    }
  };
}
```

### 3. **Enhanced Error Handling in Components**

#### AuthContext (`src/context/AuthContext.tsx`)
- ✅ Handles malformed localStorage data gracefully
- ✅ Catches API errors during login
- ✅ Provides user-friendly error messages
- ✅ Stores error state in context

#### Login Component (`src/components/Login.tsx`)
- ✅ Displays inline error messages
- ✅ Shows "Oops... Something went wrong" on login failure
- ✅ Error UI with icon and proper styling

#### ChatInterface (`src/components/ChatInterface.tsx`)
- ✅ Handles conversation creation errors
- ✅ Handles conversation loading errors
- ✅ Handles message sending errors
- ✅ Shows toast notifications for all errors
- ✅ Sets avatar to "error" state on failures

## 🎯 Error Scenarios Covered

### Backend API Errors
- **Login failures**: Shows inline error message
- **Conversation creation fails**: Shows toast notification
- **Loading conversation fails**: Shows toast notification
- **Sending message fails**: Shows toast notification + error avatar state

### Network Errors
- Network timeout or connection issues trigger error handlers
- User sees "Oops... Something went wrong" message

### React Component Errors
- Any unhandled error in React components
- ErrorBoundary catches it and shows fallback UI

### Data Errors
- Malformed JSON in localStorage
- Invalid data from API responses

## 📋 Test Coverage

All error handling has comprehensive test coverage:

- ✅ **ErrorBoundary tests** (4 tests)
  - Renders children when no error
  - Shows error UI when error thrown
  - Shows "Return to Home" button
  - Supports custom fallback

- ✅ **AuthContext error tests** (included in 13 tests)
  - Handles login errors
  - Handles localStorage errors

- ✅ **ChatInterface tests** (13 tests)
  - All tests pass with ToastProvider integration

**Total: 55 passing tests**

## 🚀 How to Test Error Handling

### Test ErrorBoundary
Run the app and intentionally throw an error in a component to see the ErrorBoundary catch it:

```tsx
// In any component
throw new Error('Test error');
```

### Test Toast Notifications
Simulate a backend error by stopping the server while trying to login or send a message.

### Test Specific Scenarios

1. **Login Error**: Stop the backend server and try to login
2. **Chat Error**: Stop the backend server and try to send a message
3. **Network Error**: Disconnect from network and use the app
4. **Bad Data**: Manually corrupt localStorage data: `localStorage.setItem('user', 'invalid')`

## 🎨 User Experience

### Before Error Handling
- ❌ App crashes on backend errors
- ❌ White screen of death
- ❌ User loses all work
- ❌ No feedback on what went wrong

### After Error Handling
- ✅ App stays functional
- ✅ User-friendly error messages
- ✅ "Oops... Something went wrong" messaging
- ✅ Users can recover from errors
- ✅ No data loss

## 🔧 Development vs Production

### Development Mode
- Shows detailed error messages
- Logs errors to console
- Displays stack traces in ErrorBoundary

### Production Mode
- Shows generic "Something went wrong" messages
- Still logs errors to console for monitoring
- Hides stack traces from users

## 📝 Best Practices

1. **Always wrap API calls in try-catch**
   ```tsx
   try {
     await api.call();
   } catch (error) {
     showError('Oops... Something went wrong.');
   }
   ```

2. **Use meaningful error messages**
   - ❌ "Error" or "Failed"
   - ✅ "Oops... Something went wrong. Please try again."

3. **Don't expose technical details to users**
   - Use generic messages in production
   - Log detailed errors to console

4. **Provide recovery options**
   - "Try again" buttons
   - "Return to home" links
   - Clear error messages

## 🐛 Debugging

### View Error Logs
Open browser console to see detailed error logs:
```
console.error('ErrorBoundary caught an error:', error, errorInfo);
```

### Test Error Boundaries
Use React DevTools to inspect ErrorBoundary state.

### Monitor Toast State
The ToastProvider manages a queue of toasts. Check React DevTools to see active toasts.

## 📊 Error Types

| Error Type | Handler | User Feedback | Recovery |
|------------|---------|---------------|----------|
| React Rendering | ErrorBoundary | Full-page error UI | Return to home |
| API Login | try-catch + state | Inline error message | Retry login |
| API Chat | try-catch + toast | Toast notification | Retry action |
| Network | try-catch + toast | Toast notification | Check connection |
| Data Parsing | try-catch + cleanup | Silent recovery | Auto-fix |

## 🎯 Future Improvements

- Add retry logic for failed API calls
- Implement error tracking service (e.g., Sentry)
- Add offline mode detection
- Show specific error codes for debugging
- Add "Report Error" button to ErrorBoundary

## ✅ Summary

The frontend is now **resilient to backend errors** and will not crash the entire application when something goes wrong. Users see friendly "Oops... Something went wrong" messages and can continue using the app or recover gracefully.
