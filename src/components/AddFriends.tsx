import { VNode } from 'preact';
import { addNewFriendToProfile } from '../apis/solid/friendsUtils';

export default function AddFriends({webID, authFetch, close, onFriendAdded}: {
	webID: string,
	authFetch: typeof fetch,
	close: () => void, onFriendAdded: (friendId: string) => Promise<void>}): VNode {

  async function handleAddFriend() {
	try {
	  const newFriendWebID = (document.getElementById("friend") as HTMLInputElement).value;
	  if (!newFriendWebID.length) return;

	  await addNewFriendToProfile(webID, newFriendWebID, authFetch);

	  await onFriendAdded(newFriendWebID);
	} catch (error) {
	  console.error('Error adding friend:', error);
	  alert('Failed to add friend. Please try again.');
	}
  }

	return (
		<div class='add-popup'>
			<div class='add-logout-menu' style="height: 30vh">
				<button class='add-popup-close' onClick={close}>❌</button>
				<div class="add-friends-container">
					<h2>Add Friends</h2>
                    <h4>Enter the webID</h4>
                    <input id="friend"/>
					<input
						class="btn-primary"
						type='submit'
						onClick={handleAddFriend}
						value='Add'
                    />
				</div>
			</div>
		</div>
	);
}
