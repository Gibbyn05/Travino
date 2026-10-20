type PlanningProgress = {
  activities: readonly unknown[];
  packing: readonly { done: boolean }[];
};

type TripNextStep = {
  title: string;
  button: string;
  icon: 'add' | 'bag-handle-outline' | 'checkmark-circle-outline' | 'images-outline';
  target: 'add-activity' | 'Packing' | 'Plan' | 'Memories';
};

/** Offer one useful next step without requiring dates or invitations. */
export function tripNextStep(trip: PlanningProgress, completed = false): TripNextStep {
  if (completed) return { title: 'Keep the memories', button: 'View memories', icon: 'images-outline', target: 'Memories' };
  if (!trip.activities.length) return { title: 'Plan your days', button: 'Add an activity', icon: 'add', target: 'add-activity' };
  if (!trip.packing.length) return { title: 'Pack for your trip', button: 'Create packing list', icon: 'bag-handle-outline', target: 'Packing' };
  if (trip.packing.some(item => !item.done)) return { title: 'Keep packing', button: 'Continue packing', icon: 'bag-handle-outline', target: 'Packing' };
  return { title: 'All packed!', button: 'View plan', icon: 'checkmark-circle-outline', target: 'Plan' };
}
