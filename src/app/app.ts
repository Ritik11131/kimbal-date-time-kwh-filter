import { Component, signal } from '@angular/core';
import { ActivatedRoute, RouterOutlet } from '@angular/router';

export interface ControlSectionData {
  id: string;
  title: string;
  fromTime: string;
  toTime: string;
  purchase: string;
  // consumption: string;
  // surplus: string;
  isPositive: boolean;
}
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})



export class App {

}
