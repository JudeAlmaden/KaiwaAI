import PageHeader from "../PageHeader";
import FriendsPanel from "../groups/FriendsPanel";

// Friends left the hub's tab bar: requests and invites are management, not
// conversations. The inbox links here through its requests banner and the
// compose sheet's "Add a friend".
export default function FriendsPage() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Friends"
        jp="友達"
        subtitle="Add people, accept requests, and join group invites"
        compact
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:px-8 sm:py-5 sm:pb-8">
        <div className="mx-auto w-full max-w-2xl">
          <FriendsPanel />
        </div>
      </div>
    </div>
  );
}
