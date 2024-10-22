import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../../components/ui/dropdown-menu';
import { Edit, Trash2, MoreHorizontal, ArrowLeft, Copy, MapPin, UtensilsCrossed, Euro, Star } from 'lucide-react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { useRestaurantDetails } from '../hooks/useRestaurantDetails';
import { useRestaurantOperations } from '../hooks/useRestaurantOperations';
import { addReview } from '../../../supabaseClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

const RestaurantDetails = ({ user, updateLocalRestaurant, deleteLocalRestaurant, addLocalRestaurant }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { restaurant, loading, error, refetch } = useRestaurantDetails(id);
  const { deleteRestaurant } = useRestaurantOperations();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

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
    return restaurant.restaurant_reviews.find(review => review.user_id === user.id);
  }, [restaurant, user.id]);

  const handleReviewSubmit = useCallback(async () => {
    try {
      await addReview({
        user_id: user.id,
        restaurant_id: id,
        rating: reviewRating,
        review: reviewText
      });
      setIsReviewDialogOpen(false);
      // Refresh restaurant data
      const updatedRestaurant = await refetch();
      updateLocalRestaurant(updatedRestaurant);
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review: ' + error.message);
    }
  }, [user.id, id, reviewRating, reviewText, refetch, updateLocalRestaurant]);

  const handleEdit = () => navigate(`/edit/${restaurant.id}`);
  
  const handleDelete = async () => {
    try {
      await deleteRestaurant(restaurant.id);
      deleteLocalRestaurant(restaurant.id);
      navigate('/');
    } catch (error) {
      console.error('Failed to delete restaurant:', error);
      alert('Failed to delete restaurant: ' + error.message);
    }
  };

  const handleCopy = async () => {
    try {
      const copiedRestaurant = await copyRestaurant(user.id, restaurant.id);
      addLocalRestaurant(copiedRestaurant);
      alert('Restaurant copied to your list!');
    } catch (error) {
      console.error('Failed to copy restaurant:', error);
      alert('Failed to copy restaurant: ' + error.message);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500">Error: {error}</div>;
  if (!restaurant) return <div className="text-center">Restaurant not found</div>;

  const isOwner = restaurant.user_id === user.id;

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const PriceDisplay = ({ price }) => (
    <div className="flex items-center">
      <Euro className="w-4 h-4 mr-1" />
      <span className="text-sm font-semibold">
        {[1, 2, 3].map((value) => (
          <span 
            key={value} 
            className={value <= price ? 'text-black' : 'text-slate-300'}
          >
            €
          </span>
        ))}
      </span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="p-0 hover:bg-transparent"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {isOwner ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="transition-colors duration-200 text-gray-400 hover:text-gray-500"
          >
            <Copy className="h-5 w-5" />
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader className="relative pb-0">
          <div className="absolute top-4 right-4">
            {restaurant.to_try ? (
              <Badge className="bg-green-400 text-black font-bold">
                To Try
              </Badge>
            ) : aggregateRating > 0 ? (
              <div className="bg-yellow-400 text-black text-sm font-bold rounded px-2 py-1 flex items-center">
                <Star className="w-4 h-4 mr-1" />
                {aggregateRating.toFixed(1)}
              </div>
            ) : null}
          </div>
          <div className="w-full h-48 bg-slate-200 rounded-t-xl flex items-center justify-center mb-4">
            <span className="text-6xl font-bold text-slate-400">
              {getInitials(restaurant.name)}
            </span>
          </div>
          <CardTitle className="text-2xl mb-2">{restaurant.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center">
              <UtensilsCrossed className="w-4 h-4 mr-1" />
              <span>{restaurant.restaurant_types?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{restaurant.cities?.name || 'N/A'}</span>
            </div>
            <PriceDisplay price={restaurant.price} />
          </div>
          {restaurant.notes && (
            <div className="mt-4 bg-gray-50 p-3 rounded-md">
              <h4 className="font-semibold mb-2">Notes</h4>
              <p className="text-gray-700">{restaurant.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ratings & Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-lg font-semibold">Overall Rating</h4>
              {aggregateRating > 0 ? (
                <div className="flex items-center">
                  <span className="text-3xl font-bold mr-2">{aggregateRating.toFixed(1)}</span>
                  <Star className="w-6 h-6 text-yellow-400" />
                </div>
              ) : (
                <p>No ratings yet</p>
              )}
              <p className="text-sm text-gray-500">Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-2">Your Review</h4>
              {userReview ? (
                <div>
                  <p className="font-bold">{userReview.rating}/10</p>
                  <p className="text-sm text-gray-600 mb-2">{userReview.review}</p>
                  <Button 
                    onClick={() => {
                      setReviewRating(userReview.rating);
                      setReviewText(userReview.review || '');
                      setIsReviewDialogOpen(true);
                    }}
                    size="sm"
                  >
                    Edit Review
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsReviewDialogOpen(true)}>Add Review</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this restaurant?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the restaurant from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{userReview ? 'Edit' : 'Add'} Review</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide your rating and review for this restaurant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <Input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={reviewRating}
              onChange={(e) => setReviewRating(parseFloat(e.target.value))}
              placeholder="Rating (0-10)"
            />
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Your review"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReviewSubmit}>Submit Review</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantDetails;