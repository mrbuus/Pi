import { Controller, Get, Header, Query } from '@nestjs/common';
import { CalendarIcsService } from './calendar-ics.service';

/** Public iCalendar subscription endpoint: the opaque query token is the bearer credential. */
@Controller()
export class CalendarIcsFeedController {
  constructor(private readonly calendars: CalendarIcsService) {}

  @Get('schedule/my.ics')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'inline; filename="pi.mn-huvaari.ics"')
  @Header('Cache-Control', 'private, no-store')
  async feed(
    @Query('token') token?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.calendars.feedByToken(token, from, to);
    return result.ics;
  }
}
