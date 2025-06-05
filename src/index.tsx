import { render } from 'preact';
import App from './components/App';

const root = document.getElementById('root');
if (root) {
    render(<App />, root);
} else {
    console.error('Root element not found');
}
