import { IonicModule, GestureController, GestureDetail, Platform, RefresherEventDetail, RefresherCustomEvent } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, formatDate } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, AfterContentChecked, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StorageCanteen } from '../interfaces/storage-canteen';
import { StorageService } from '../services/storage.service';
import { Canteen } from '../interfaces/canteen';
import { Meal } from '../classes/meal';
import { NavbarHeaderComponent } from '../navbar-header/navbar-header.component';
import { clear } from 'console';
import { get } from 'http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule, NavbarHeaderComponent],
})
export class HomePage implements OnInit, AfterContentChecked, AfterViewInit {
  selectedCantine: string = '';
  selectedCantineData: StorageCanteen | null = null;
  currentMeals: Meal[] = [];
  canteens: Canteen[] = [];
  updating = false;
  // if selected date is weekend set to monday if its a weekday set to today
  selectedDate: string = this.getDateAsString(
    new Date().getDay() == 6 || new Date().getDay() == 0 ? new Date(new Date().getTime() + 24 * 60 * 60 * 1000) : new Date()
  );

  formattedDate = formatDate(this.selectedDate, 'EEE dd.MM.YY', 'de-DE');
  loading = false;

  constructor(
    private router: Router,
    private storageService: StorageService,
    private gestureController: GestureController,
    private cdRef: ChangeDetectorRef,
    public platform: Platform
  ) {}

  ngOnInit(): void {
    if (!this.router.navigated) this.router.navigate(['/']);
  }

  ngAfterViewInit(): void {
    const gesture = this.gestureController.create({
      el: document.getElementById('menu-container')!,
      onStart: () => this.cdRef.detectChanges(),
      onMove: (ev: GestureDetail) => {
        let deltaX = ev.deltaX;
        if (deltaX < -80) {
          gesture.enable(false);
          this.incrementDate().then(() => {
            this.cdRef.detectChanges();
            gesture.enable();
          });
        } else if (deltaX > 80) {
          gesture.enable(false);
          this.decrementDate().then(() => {
            this.cdRef.detectChanges();
            gesture.enable();
          });
        }
      },
      onEnd: () => this.cdRef.detectChanges(),
      gestureName: 'swipeOnMenu',
    });
    gesture.enable();

    document.getElementById('refresher')?.addEventListener('ionRefresh', ((event: RefresherCustomEvent) => {
      this.handleRefresh(event);
    }) as EventListener);
  }

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
      this.currentMeals = this.getMealsOfSelectedCanteenAt(this.selectedDate);
      this.loading = false;
      if (this.currentMeals.length == 0) this.updating = false;
    }
  }

  // Update the canteen data for the selected canteen if the selected canteen changes
  async onSelectChange() {
    this.loading = true;
    await this.storageService.updateMenus(this.selectedCantine);
    this.selectedCantineData = await this.storageService.getCanteen(this.selectedCantine);
    if (this.selectedCantineData) {
      this.currentMeals = this.getMealsOfSelectedCanteenAt(this.selectedDate);
    } else {
      this.currentMeals = [];
    }
    this.loading = false;
  }

  // Update the canteen data for the selected date if the selected date changes
  async incrementDate() {
    let newDate;
    // if selected date is friday, increment by 3 days
    if (new Date(this.selectedDate).getDay() == 5) {
      newDate = new Date(new Date(this.selectedDate).getTime() + 3 * 24 * 60 * 60 * 1000);
    } else {
      newDate = new Date(new Date(this.selectedDate).getTime() + 24 * 60 * 60 * 1000);
    }
    let canteenMeals = this.getMealsOfSelectedCanteenAt(this.getDateAsString(newDate));
    if (canteenMeals.length == 0) {
      return;
    }
    this.selectedDate = this.getDateAsString(newDate);
    this.formattedDate = formatDate(this.selectedDate, 'EEE dd.MM.YY', 'de-DE');
    this.currentMeals = canteenMeals;
  }

  async decrementDate() {
    let newDate;
    if (new Date(this.selectedDate).getDay() == 1) {
      newDate = new Date(new Date(this.selectedDate).getTime() - 3 * 24 * 60 * 60 * 1000);
    } else {
      newDate = new Date(new Date(this.selectedDate).getTime() - 24 * 60 * 60 * 1000);
    }
    let canteenMeals = this.getMealsOfSelectedCanteenAt(this.getDateAsString(newDate));
    if (canteenMeals.length == 0) {
      return;
    }
    this.selectedDate = this.getDateAsString(newDate);
    this.formattedDate = formatDate(this.selectedDate, 'EEE dd.MM.YY', 'de-DE');
    this.currentMeals = canteenMeals;
  }

  async today() {
    // selected date to today
    this.selectedDate = this.getDateAsString(new Date());
    this.formattedDate = formatDate(this.selectedDate, 'EEE dd.MM.YY', 'de-DE');
    this.currentMeals = [];
    this.currentMeals = this.getMealsOfSelectedCanteenAt(this.selectedDate);
  }

  getDateAsString(date: Date): string {
    return date.toISOString().substring(0, 10);
  }

  getMealsOfSelectedCanteenAt(date: string): Meal[] {
    return this.selectedCantineData?.menu.find((menu) => menu.date === date)?.meals ?? [];
  }

  async handleRefresh(event: RefresherCustomEvent) {
    const timeoutId = setTimeout(() => {
      console.error('Could not refresh because of timeout!');
    }, 10000);
    await this.storageService.reloadMenuesOfCanteenFromDb(this.selectedCantine).then(() => event.target.complete());
    clearTimeout(timeoutId);
  }
}
