import { Component, signal } from '@angular/core';

@Component({
  selector: 'cal-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('demo');
}
