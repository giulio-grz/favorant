import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Edit, Trash2, MoreVertical, Star } from 'lucide-react';
import { useRestaurantDetails } from '../hooks/useRestaurantDetails';
import RestaurantNotes from './RestaurantNotes';
import { 
  supabase,
  removeRestaurantFromUserList,
  addReview
} from '@/supabaseClient';

const RestaurantDetails = ({ user, updateLocalRestaurant, deleteLocalRestaurant, addLocalRestaurant }) => {
  const { id, userId: viewingUserId } = useParams();
  const navigate = useNavigate();
  const { restaurant, loading, error, refetch } = useRestaurantDetails(id, viewingUserId);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });
  const [isInUserList, setIsInUserList] = useState(false);

  useEffect(() => {
    const checkUserList = async () => {
      try {
        // Check for bookmark
        const { data: bookmark } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .eq('restaurant_id', id)
          .maybeSingle();

        // Check for review
        const { data: review } = await supabase
          .from('restaurant_reviews')
          .select('*')
          .eq('user_id', user.id)
          .eq('restaurant_id', id)
          .maybeSingle();

        setIsInUserList(!!(bookmark || review));
      } catch (error) {
        console.error('Error checking user list:', error);
      }
    };

    checkUserList();
  }, [user.id, id]);

  const formatRating = (rating) => {
    return Number.isInteger(rating) ? rating.toFixed(1) : rating.toFixed(1);
  };  

  const { aggregateRating, reviewCount } = useMemo(() => {
    if (!restaurant || !restaurant.restaurant_reviews) {
      return { aggregateRating: 0, reviewCount: 0 };
    }
    const reviews = restaurant.restaurant_reviews;
    const count = reviews.length;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return {
      aggregateRating: count > 0 ? sum / count : 0,
      reviewCount: count
    };
  }, [restaurant]);

  const userReview = useMemo(() => {
    if (!restaurant || !restaurant.restaurant_reviews) return null;
    return restaurant.restaurant_reviews.find(review => 
      viewingUserId 
        ? review.user_id === viewingUserId 
        : review.user_id === user.id
    );
  }, [restaurant, user.id, viewingUserId]);

  const handleReviewSubmit = async () => {
    if (viewingUserId) return; // Don't allow review submission when viewing other's profile
    
    try {
      const result = await addReview({
        user_id: user.id,
        restaurant_id: restaurant.id,
        rating: reviewRating
      });
      
      await refetch();
      setIsReviewDialogOpen(false);
      setReviewRating(0);
    } catch (error) {
      console.error('Error submitting review:', error);
      setAlert({ show: true, message: 'Failed to submit review', type: 'error' });
    }
  };

  const handleRemoveFromList = async (restaurantId) => {
    if (viewingUserId) return; // Don't allow removal when viewing other's profile

    try {
      const result = await removeRestaurantFromUserList(user.id, restaurantId);
      if (result.success) {
        deleteLocalRestaurant(restaurantId); // Make sure this is being called
        navigate('/'); // Navigate back to main list
      } else {
        throw new Error('Failed to remove restaurant');
      }
    } catch (error) {
      console.error('Error removing restaurant from list:', error);
      setAlert({ show: true, message: 'Failed to remove restaurant', type: 'error' });
    }
  };  

  const isOwner = restaurant?.created_by === user.id;

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!restaurant) return <div>Restaurant not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="p-0 hover:bg-transparent"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {!viewingUserId && isInUserList && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwner && (
                <DropdownMenuItem onClick={() => navigate(`/edit/${restaurant.id}`)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Remove from list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="relative bg-slate-100 h-64 rounded-xl mb-6 flex items-center justify-center">
        <div className="text-6xl font-bold text-slate-400">
          {restaurant?.name.substring(0, 2).toUpperCase()}
        </div>
        {restaurant?.to_try ? (
          <div className="absolute bottom-4 left-4">
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              To Try
            </Badge>
          </div>
        ) : (
          userReview && (
            <div className="absolute bottom-4 right-4 bg-white rounded-full px-4 py-1 text-sm font-semibold">
              {formatRating(userReview.rating)}
            </div>
          )
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{restaurant?.name}</h1>
          <div className="flex items-center space-x-2 text-gray-500">
            <span>{restaurant?.restaurant_types?.name}</span>
            <span>•</span>
            <span>{restaurant?.cities?.name}</span>
            <span>•</span>
            <span>{'€'.repeat(restaurant?.price || 0)}</span>
          </div>
          {restaurant?.address && (
            <div className="text-gray-500 mt-1">{restaurant.address}</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {!viewingUserId && isInUserList && !restaurant?.to_try && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Your Rating</h2>
              {userReview ? (
                <div>
                  <div className="text-3xl font-bold mb-2 flex items-center">
                    {formatRating(userReview.rating)}
                    <Star className="h-5 w-5 ml-2 text-yellow-400 fill-current" />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setReviewRating(userReview.rating);
                      setIsReviewDialogOpen(true);
                    }}
                    className="mt-4"
                  >
                    Edit Rating
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsReviewDialogOpen(true)}>
                  Add Rating
                </Button>
              )}
            </div>
          )}

          <div className={!viewingUserId && isInUserList ? "col-span-1" : "col-span-2"}>
            <h2 className="text-lg font-semibold mb-2">Overall Rating</h2>
            {aggregateRating > 0 ? (
              <div>
                <div className="text-3xl font-bold mb-2 flex items-center">
                  {formatRating(aggregateRating)}
                  <Star className="h-5 w-5 ml-2 text-yellow-400 fill-current" />
                </div>
                <div className="text-sm text-gray-500">
                  Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No ratings yet</div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        {!viewingUserId && isInUserList && (
          <div className="mt-8">
            <RestaurantNotes user={user} restaurantId={id} />
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from your list?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {restaurant?.name} from your list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleRemoveFromList(restaurant.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{userReview ? 'Edit' : 'Add'} Rating</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center space-x-4">
                <Slider
                  min={0}
                  max={10}
                  step={0.5}
                  value={[reviewRating]}
                  onValueChange={(value) => setReviewRating(value[0])}
                  className="flex-1"
                />
                <div className="w-16 text-right font-medium">
                  {reviewRating === 10 ? '10' : reviewRating.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReviewSubmit}>Save Rating</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {alert.show && (
        <AlertDialog open={alert.show} onOpenChange={() => setAlert({ ...alert, show: false })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{alert.type === 'error' ? 'Error' : 'Success'}</AlertDialogTitle>
              <AlertDialogDescription>{alert.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setAlert({ ...alert, show: false })}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default RestaurantDetails;