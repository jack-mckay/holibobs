import {CircleAlert} from 'lucide-react'
import {useState} from 'react'
export function Alert({
  status,
  message,
  dismissible,
}: {
  status?: string;
  message?: string;
  dismissible?: boolean;
}) {
  dismissible = dismissible ?? true;
  let [dismissed, setDismissed] = useState(false);

  const dismissAlert = () => {
    setDismissed(true);
  }

  return (
    <>{!dismissed && 
    <div className={`alert ${status ?? ""}`} role="alert">
      <CircleAlert size="18" /> {message} {dismissible && (
      <button type="button" className="alert-dismiss" aria-label="Close" onClick={dismissAlert}>
        &times;
      </button>
    )}
    </div>
    }</>
  );
}
