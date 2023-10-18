import { Component, OnInit, AfterContentChecked } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StorageCanteen } from '../interfaces/storage-canteen';
import { StorageService } from '../services/storage.service';
import { Canteen } from '../interfaces/canteen';
import { Meal } from '../classes/meal';
import { NavbarHeaderComponent } from '../navbar-header/navbar-header.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, NavbarHeaderComponent],
})
export class HomePage implements OnInit, AfterContentChecked {
  selectedCantine: string = '';
  selectedCantineData: StorageCanteen | null = null;
  currentMeals: Meal[] = [];
  canteens: Canteen[] = [];
  updating = false;
  selectedDate: string = new Date().toISOString().substring(0, 10);
  formattedDate = formatDate(this.selectedDate, 'EEE dd.MM.YY', 'de-DE');
  loading = false;

  constructor(private router: Router, private storageService: StorageService) {}

  ngOnInit(): void {
    if (!this.router.navigated) this.router.navigate(['/']);
  }

  // Update the canteen data for the favorite canteen
  async ngAfterContentChecked() {
    if (!this.updating) {
      this.updating = true;
      this.loading = true;
      if (!(await this.storageService.getFavoriteCanteen())) {
        this.updating = false;
        return;
      }
      this.selectedCantineData = await this.storageService.getFavoriteCanteen();
      this.selectedCantine = this.selectedCantineData.canteen._key;
      this.canteens = await this.storageService.getCanteens();
      this.currentMeals = this.selectedCantineData.menu.find((menu) => menu.date === this.selectedDate)?.meals ?? [];
      this.loading = false;
      if (this.currentMeals.length == 0) this.updating = false;
    }
  }

  // Update the canteen data for the selected canteen if the selected canteen changes
  async onSelectChange() {
    this.loading = true;
    this.currentMeals = [];
    await this.storageService.updateMenus(this.selectedCantine);
    let storageCanteen = await this.storageService.getCanteen(this.selectedCantine);
    this.selectedCantineData = storageCanteen;
    if (this.selectedCantineData) {
      this.currentMeals = this.selectedCantineData.menu.find((menu) => menu.date === this.selectedDate)?.meals ?? [];
    } else {
      this.currentMeals = [];
    }
    this.loading = false;
  }

  // Update the canteen data for the selected date if the selected date changes
  async incrementDate() {
    // if selected date is friday, increment by 3 days
    if (new Date(this.selectedDate).getDay() == 5) {
      this.selectedDate = new Date(new Date(this.selectedDate).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    } else {
      this.selectedDate = new Date(new Date(this.selectedDate).getTime() + 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    }
    this.formattedDate = formatDate(this.selectedDate, 'EEE dd.MM.YY', 'de-DE');
    this.onSelectChange();
  }

  // Update the canteen data for the selected date if the selected date changes
  async decrementDate() {
    // if selected date is monday, decrement by 3 days
    if (new Date(this.selectedDate).getDay() == 1) {
      this.selectedDate = new Date(new Date(this.selectedDate).getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    } else {
      this.selectedDate = new Date(new Date(this.selectedDate).getTime() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    }
    this.formattedDate = formatDate(this.selectedDate, 'EEE dd.MM.YY', 'de-DE');
    this.onSelectChange();
  }

  async today() {
    // selected date to today
    this.selectedDate = new Date().toISOString().substring(0, 10);
    this.formattedDate = formatDate(this.selectedDate, 'EEE dd.MM.YY', 'de-DE');
    this.onSelectChange();
  }
}
