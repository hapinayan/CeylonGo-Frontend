import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

@Component({ template: '' })
class DummyComponent {}

import { ArtisanService } from '../../services/artisan.service';
import { ProductService } from '../../services/product.service';
import { ArtisanNavigationService } from '../../services/artisan-navigation.service';
import { ContactArtisanComponent } from './contact-artisan.component';

describe('ContactArtisanComponent', () => {
  let component: ContactArtisanComponent;
  let fixture: ComponentFixture<ContactArtisanComponent>;

  const artisanServiceMock = {
    getListingById: vi.fn().mockReturnValue(
      of({
        id: 1,
        title: 'Kandy Heritage Crafts',
        district: 'Kandy',
        city: 'Kandy',
        phone: '0771234567',
        email: 'artisan@kandy.lk',
        is_verified: true,
      })
    ),
  };

  const productServiceMock = {
    getProductById: vi.fn().mockReturnValue(
      of({
        id: 101,
        title: 'Traditional Wooden Mask',
      })
    ),
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ContactArtisanComponent],
      providers: [
        provideRouter([{ path: '**', component: DummyComponent }]),
        { provide: ArtisanService, useValue: artisanServiceMock },
        { provide: ProductService, useValue: productServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['id', '1']])),
            queryParams: of({ productId: '101', quantity: '2' }),
            snapshot: {
              queryParamMap: {
                get: (key: string) => null,
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ContactArtisanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('initializes and sanitizes Sri Lankan phone number for WhatsApp link', () => {
    expect(component.sanitizedPhone()).toBe('94771234567');
    expect(component.hasWhatsApp()).toBe(true);
  });

  it('validates message length before submitting', () => {
    component.messageText.set('Hi');
    component.onSendMessage();
    expect(component.validationError()).toBe('Please write a message of at least 5 characters.');
  });

  it('formats inquiry text with quantity and product title', () => {
    expect(component.messageText()).toContain('Traditional Wooden Mask');
    expect(component.messageText()).toContain('Quantity: 2');
  });

  it('delegates goBack to ArtisanNavigationService to safely return to artisan profile', () => {
    const navService = TestBed.inject(ArtisanNavigationService);
    const spy = vi.spyOn(navService, 'navigateBackFromContact');
    component.goBack();
    expect(spy).toHaveBeenCalledWith(1, false);
  });
});
