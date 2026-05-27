'use client';

import { useCallback, useState } from 'react';

import { BookingConfirmation } from '@/components/BookingConfirmation/BookingConfirmation';
import { ChatBox } from '@/components/ChatBox/ChatBox';
import { LegList } from '@/components/LegList/LegList';
import type { Leg } from '@/components/LegList/LegList';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { Toast } from '@/components/Toast/Toast';
import { del, get, put } from '@/lib/api';
import {
  getDestinationImage,
  getDestinationImageUrl,
} from '@/lib/destinationImage';
import { formatCurrency, formatShortDate } from '@/lib/format';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import styles from './tripDetail.module.scss';

interface TripFlight {
  id: string;
  origin: string;
  destination: string;
  airline: string | null;
  flight_number: string | null;
  price: number | null;
  currency: string;
  departure_time: string | null;
}

interface TripHotel {
  id: string;
  name: string | null;
  city: string | null;
  price_per_night: number | null;
  total_price: number | null;
  currency: string;
  check_in: string | null;
  check_out: string | null;
}

interface TripCarRental {
  id: string;
  provider: string;
  car_name: string;
  car_type: string;
  total_price: number | null;
  currency: string;
}

interface TripExperience {
  id: string;
  name: string | null;
  category: string | null;
  estimated_cost: number | null;
  rating: number | null;
}

interface Trip {
  id: string;
  destination: string;
  origin: string | null;
  departure_date: string | null;
  return_date: string | null;
  budget_total: number | null;
  budget_currency: string;
  travelers: number;
  status: string;
  trip_structure?: string;
  flights: TripFlight[];
  hotels: TripHotel[];
  car_rentals: TripCarRental[];
  experiences: TripExperience[];
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'itinerary'>('chat');

  const {
    data: trip,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['trips', id],
    queryFn: () => get<{ trip: Trip }>(`/trips/${id}`).then((r) => r.trip),
  });

  const { data: legsData } = useQuery({
    queryKey: ['trip-legs', id],
    queryFn: () => get<{ legs: Leg[] }>(`/trips/${id}/legs`),
    enabled: trip?.trip_structure === 'multi_city',
  });

  const handleConfirmBooking = useCallback(async () => {
    try {
      await put(`/trips/${id}`, { status: 'saved' });
      queryClient.setQueryData<Trip>(['trips', id], (old) =>
        old ? { ...old, status: 'saved' } : old,
      );
      await queryClient.invalidateQueries({ queryKey: ['trips', id] });
      setShowConfirmation(false);
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['trips', id] });
      setToastMessage('Failed to save your booking. Please try again.');
      setShowConfirmation(false);
    }
  }, [id, queryClient]);

  const handleCancelBooking = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonLayout}>
          <Skeleton width='60%' height={28} />
          <Skeleton width='100%' height={400} />
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className={styles.page}>
        <Link href='/trips' className={styles.back}>
          &larr; Back to trips
        </Link>
        <p>Trip not found.</p>
      </div>
    );
  }

  const toNum = (v: number | string | null | undefined): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  };
  const flightTotal = trip.flights.reduce((sum, f) => sum + toNum(f.price), 0);
  const hotelTotal = trip.hotels.reduce(
    (sum, h) => sum + toNum(h.total_price),
    0,
  );
  const carRentalTotal = trip.car_rentals.reduce(
    (sum, c) => sum + toNum(c.total_price),
    0,
  );
  const experienceTotal = trip.experiences.reduce(
    (sum, e) => sum + toNum(e.estimated_cost),
    0,
  );
  const rawAllocated =
    flightTotal + hotelTotal + carRentalTotal + experienceTotal;
  const allocated = Number.isFinite(rawAllocated) ? rawAllocated : 0;
  const remaining =
    trip.budget_total != null && Number.isFinite(trip.budget_total - allocated)
      ? trip.budget_total - allocated
      : null;

  const hasFlights = trip.flights.length > 0;

  const { url, unsplashId } = getDestinationImage(trip.destination);
  const hasHero = url !== null && unsplashId !== null;

  return (
    <div className={styles.page}>
      {/* Full-bleed destination banner */}
      <div className={styles.banner}>
        {hasHero && unsplashId ? (
          <Image
            src={getDestinationImageUrl(unsplashId, 1400, 200)}
            alt={trip.destination}
            fill
            sizes='100vw'
            style={{ objectFit: 'cover' }}
            priority
          />
        ) : (
          <div className={styles.bannerGradient} />
        )}
        <div className={styles.bannerOverlay}>
          <div className={styles.bannerContent}>
            <Link href='/trips' className={styles.back}>
              All trips
            </Link>
            <h1 className={styles.bannerTitle}>{trip.destination}</h1>
            <p className={styles.bannerMeta}>
              {!trip.departure_date && !trip.return_date
                ? 'Dates not set'
                : `${formatShortDate(trip.departure_date)} – ${formatShortDate(trip.return_date)}`}
              {' · '}
              {trip.travelers} {trip.travelers === 1 ? 'traveler' : 'travelers'}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'itinerary' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('itinerary')}
        >
          Itinerary
        </button>
      </div>

      {/* Split view */}
      <div className={styles.splitView}>
        {/* Chat pane (left) */}
        <div
          className={`${styles.chatPane} ${activeTab === 'chat' ? styles.paneActive : ''}`}
        >
          <ChatBox
            tripId={trip.id}
            initialDestination={trip.destination}
            hasFlights={hasFlights}
            hasHotels={trip.hotels.length > 0}
            experiencesEmpty={trip.experiences.length === 0}
            carRentalsEmpty={trip.car_rentals.length === 0}
            tripStatus={trip.status}
            onBookTrip={() => setShowConfirmation(true)}
          />
        </div>

        {/* Itinerary pane (right) */}
        <div
          className={`${styles.itineraryPane} ${activeTab === 'itinerary' ? styles.paneActive : ''}`}
        >
          {/* Multi-city legs */}
          {trip.trip_structure === 'multi_city' && (
            <div data-testid='leg-list' className={styles.legsSection}>
              <p className={styles.categoryLabel}>Trip Legs</p>
              <LegList
                legs={legsData?.legs ?? []}
                onRemoveLeg={(legId) => {
                  void del(`/trips/${id}/legs/${legId}`).then(() =>
                    queryClient.invalidateQueries({
                      queryKey: ['trip-legs', id],
                    }),
                  );
                }}
              />
            </div>
          )}

          {/* Budget widget */}
          {trip.budget_total != null && (
            <div className={styles.budgetWidget}>
              <p className={styles.budgetLabel}>Total Budget</p>
              <p className={styles.budgetAmount}>
                {formatCurrency(trip.budget_total, trip.budget_currency)}
              </p>
              <div className={styles.budgetBar}>
                {flightTotal > 0 && (
                  <div
                    className={styles.budgetSegment}
                    style={{
                      width: `${(flightTotal / trip.budget_total) * 100}%`,
                      background: 'var(--ocean)',
                    }}
                  />
                )}
                {hotelTotal > 0 && (
                  <div
                    className={styles.budgetSegment}
                    style={{
                      width: `${(hotelTotal / trip.budget_total) * 100}%`,
                      background: 'var(--sand)',
                    }}
                  />
                )}
                {experienceTotal > 0 && (
                  <div
                    className={styles.budgetSegment}
                    style={{
                      width: `${(experienceTotal / trip.budget_total) * 100}%`,
                      background: 'var(--lagoon)',
                    }}
                  />
                )}
                {carRentalTotal > 0 && (
                  <div
                    className={styles.budgetSegment}
                    style={{
                      width: `${(carRentalTotal / trip.budget_total) * 100}%`,
                      background: 'var(--sunset)',
                    }}
                  />
                )}
              </div>
              <div className={styles.budgetLegend}>
                {flightTotal > 0 && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--ocean)' }}
                    />
                    Flights {formatCurrency(flightTotal, trip.budget_currency)}
                  </span>
                )}
                {hotelTotal > 0 && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--sand)' }}
                    />
                    Hotels {formatCurrency(hotelTotal, trip.budget_currency)}
                  </span>
                )}
                {experienceTotal > 0 && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--lagoon)' }}
                    />
                    Experiences{' '}
                    {formatCurrency(experienceTotal, trip.budget_currency)}
                  </span>
                )}
                {carRentalTotal > 0 && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--sunset)' }}
                    />
                    Car Rentals{' '}
                    {formatCurrency(carRentalTotal, trip.budget_currency)}
                  </span>
                )}
                {remaining != null && (
                  <span className={styles.legendItem}>
                    <span
                      className={styles.legendDot}
                      style={{ background: 'var(--surface)' }}
                    />
                    Remaining {formatCurrency(remaining, trip.budget_currency)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Flights */}
          {trip.flights.length > 0 && (
            <>
              <p className={styles.categoryLabel}>Flights</p>
              {trip.flights.map((f) => (
                <div key={f.id} className={styles.itemCard}>
                  <div className={`${styles.itemIcon} ${styles.flights}`}>
                    &#9992;
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>
                      {f.airline} {f.flight_number}
                    </p>
                    <p className={styles.itemSubtitle}>
                      {f.origin} &rarr; {f.destination}
                    </p>
                  </div>
                  {f.price != null && (
                    <span className={styles.itemPrice}>
                      {formatCurrency(f.price, f.currency)}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Hotels */}
          {trip.hotels.length > 0 && (
            <>
              <p className={styles.categoryLabel}>Hotels</p>
              {trip.hotels.map((h) => (
                <div key={h.id} className={styles.itemCard}>
                  <div className={`${styles.itemIcon} ${styles.hotels}`}>
                    &#127976;
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>{h.name ?? 'Hotel'}</p>
                    <p className={styles.itemSubtitle}>
                      {h.city}
                      {h.check_in && h.check_out
                        ? ` · ${formatShortDate(h.check_in)} – ${formatShortDate(h.check_out)}`
                        : ''}
                    </p>
                  </div>
                  {h.total_price != null && (
                    <span className={styles.itemPrice}>
                      {formatCurrency(h.total_price, h.currency)}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Experiences */}
          {trip.experiences.length > 0 && (
            <>
              <p className={styles.categoryLabel}>Experiences</p>
              {trip.experiences.map((exp) => (
                <div key={exp.id} className={styles.itemCard}>
                  <div className={`${styles.itemIcon} ${styles.experiences}`}>
                    &#127919;
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>
                      {exp.name ?? 'Experience'}
                    </p>
                    <p className={styles.itemSubtitle}>
                      {exp.category}
                      {exp.rating != null ? ` · ${exp.rating}/5` : ''}
                    </p>
                  </div>
                  {exp.estimated_cost != null && (
                    <span className={styles.itemPrice}>
                      ~{formatCurrency(exp.estimated_cost)}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Car Rentals */}
          {trip.car_rentals.length > 0 && (
            <>
              <p className={styles.categoryLabel}>Car Rentals</p>
              {trip.car_rentals.map((c) => (
                <div key={c.id} className={styles.itemCard}>
                  <div className={`${styles.itemIcon} ${styles.carRentals}`}>
                    &#128663;
                  </div>
                  <div className={styles.itemContent}>
                    <p className={styles.itemTitle}>{c.car_name}</p>
                    <p className={styles.itemSubtitle}>
                      {c.provider} · {c.car_type}
                    </p>
                  </div>
                  {c.total_price != null && (
                    <span className={styles.itemPrice}>
                      {formatCurrency(c.total_price, c.currency)}
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {trip.flights.length === 0 &&
            trip.hotels.length === 0 &&
            trip.experiences.length === 0 &&
            trip.car_rentals.length === 0 && (
              <div className={styles.emptyState}>
                No itinerary items yet. Use the chat to start planning!
              </div>
            )}

          {/* Save button */}
          {trip.status !== 'saved' && hasFlights && (
            <button
              className={styles.saveButton}
              onClick={() => setShowConfirmation(true)}
            >
              Save Itinerary
            </button>
          )}

          {trip.status === 'saved' && (
            <div className={styles.savedBadge}>Itinerary Saved</div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showConfirmation && (
        <BookingConfirmation
          destination={trip.destination}
          departureDate={trip.departure_date}
          returnDate={trip.return_date}
          flights={trip.flights}
          hotels={trip.hotels}
          carRentals={trip.car_rentals.map((c) => ({
            ...c,
            total_price: Number.isFinite(c.total_price)
              ? (c.total_price ?? 0)
              : 0,
          }))}
          experiences={trip.experiences}
          budgetTotal={trip.budget_total}
          budgetCurrency={trip.budget_currency}
          onConfirm={handleConfirmBooking}
          onCancel={handleCancelBooking}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage('')} />
      )}
    </div>
  );
}
