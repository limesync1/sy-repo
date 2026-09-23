export const STOPS_PER_EMPLOYEE_DAY = 8;
export const BUSY_STOP_LOAD_PCT = 90;
export const OVERLOADED_STOP_LOAD_PCT = 100;

export type StopCapacity = {
  load_pct: number;
  stops_booked: number;
  stops_capacity: number;
};

export function stopCapacity(stops: number, employees = 1): StopCapacity {
  const stops_booked = Math.max(0, stops);
  const stops_capacity = Math.max(1, employees) * STOPS_PER_EMPLOYEE_DAY;
  return {
    stops_booked,
    stops_capacity,
    load_pct: Math.round((stops_booked / stops_capacity) * 100),
  };
}

export const isBusyStopLoad = (capacity?: StopCapacity | null) =>
  !!capacity && capacity.load_pct >= BUSY_STOP_LOAD_PCT && capacity.load_pct <= OVERLOADED_STOP_LOAD_PCT;

export const isOverloadedStopLoad = (capacity?: StopCapacity | null) =>
  !!capacity && capacity.stops_booked > capacity.stops_capacity;
