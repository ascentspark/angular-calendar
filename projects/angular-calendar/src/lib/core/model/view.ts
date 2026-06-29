/** The built-in view modes the calendar host can switch between. */
export type CalendarViewName =
  | 'month'
  | 'week'
  | 'work-week'
  | 'day'
  | 'year'
  | 'timeline'
  | 'timeline-year'
  | 'agenda';

/** Whether the time axis runs horizontally (time on X) or vertically (time on Y). */
export type TimeAxisOrientation = 'horizontal' | 'vertical';
