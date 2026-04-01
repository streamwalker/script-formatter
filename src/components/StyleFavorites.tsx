import { useState, useEffect } from 'react';
import { Heart, Trash2, Blend } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArtStyle, getStyleById, StyleMix, generateMixedStylePrompt } from '@/lib/artStyles';
import {
  StyleFavorite,
  getFavorites,
  addStyleFavorite,
  addMixFavorite,
  removeFavorite,
  isFavorited,
  isMixFavorited,
} from '@/lib/styleFavorites';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface StyleFavoritesProps {
  onSelectStyle: (style: ArtStyle) => void;
  onSelectMix: (mix: StyleMix, promptModifier: string) => void;
  selectedStyle: ArtStyle;
  disabled?: boolean;
}

export function StyleFavorites({
  onSelectStyle,
  onSelectMix,
  selectedStyle,
  disabled,
}: StyleFavoritesProps) {
  const [favorites, setFavorites] = useState<StyleFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        const favs = await getFavorites();
        setFavorites(favs);
      }
      setIsLoading(false);
    };

    checkAuthAndFetch();
  }, []);

  const handleRemove = async (id: string) => {
    const success = await removeFavorite(id);
    if (success) {
      setFavorites(prev => prev.filter(f => f.id !== id));
      toast.success('Removed from favorites');
    }
  };

  const handleSelectFavorite = (fav: StyleFavorite) => {
    if (fav.isMix && fav.primaryStyle && fav.secondaryStyle) {
      const mix: StyleMix = {
        primaryStyle: fav.primaryStyle as ArtStyle,
        secondaryStyle: fav.secondaryStyle as ArtStyle,
        primaryIntensity: fav.primaryIntensity || 70,
        secondaryIntensity: fav.secondaryIntensity || 30,
      };
      onSelectMix(mix, generateMixedStylePrompt(mix));
    } else if (fav.styleId) {
      onSelectStyle(fav.styleId as ArtStyle);
    }
  };

  if (isLoading) return null;
  if (!isAuthenticated) return null;
  if (favorites.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
        <label className="text-sm font-medium text-foreground">Favorites</label>
        <span className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
          {favorites.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {favorites.map(fav => {
          const style = fav.styleId ? getStyleById(fav.styleId as ArtStyle) : null;
          const primaryStyle = fav.primaryStyle ? getStyleById(fav.primaryStyle as ArtStyle) : null;
          const secondaryStyle = fav.secondaryStyle ? getStyleById(fav.secondaryStyle as ArtStyle) : null;

          return (
            <div
              key={fav.id}
              className={cn(
                'group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                'hover:border-primary/50 cursor-pointer',
                fav.isMix
                  ? 'bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30'
                  : 'bg-secondary/30 border-border'
              )}
            >
              <button
                onClick={() => handleSelectFavorite(fav)}
                disabled={disabled}
                className="flex items-center gap-2"
              >
                {fav.isMix ? (
                  <>
                    <Blend className="h-4 w-4 text-primary" />
                    <span className="text-sm">
                      {fav.customName || `${primaryStyle?.name} + ${secondaryStyle?.name}`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-lg">{style?.preview}</span>
                    <span className="text-sm">{fav.customName || style?.name}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleRemove(fav.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/20 rounded"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hook for favoriting styles from cards
export function useFavoriteStyle() {
  const [favorites, setFavorites] = useState<StyleFavorite[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      if (user) {
        const favs = await getFavorites();
        setFavorites(favs);
      }
    };
    init();
  }, []);

  const toggleFavorite = async (styleId: ArtStyle) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save favorites');
      return;
    }

    const existing = isFavorited(favorites, styleId);
    if (existing) {
      const success = await removeFavorite(existing.id);
      if (success) {
        setFavorites(prev => prev.filter(f => f.id !== existing.id));
        toast.success('Removed from favorites');
      }
    } else {
      const newFav = await addStyleFavorite(styleId);
      if (newFav) {
        setFavorites(prev => [newFav, ...prev]);
        toast.success('Added to favorites');
      }
    }
  };

  const toggleMixFavorite = async (mix: StyleMix) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to save favorites');
      return;
    }

    const existing = isMixFavorited(favorites, mix);
    if (existing) {
      const success = await removeFavorite(existing.id);
      if (success) {
        setFavorites(prev => prev.filter(f => f.id !== existing.id));
        toast.success('Removed from favorites');
      }
    } else {
      const newFav = await addMixFavorite(mix);
      if (newFav) {
        setFavorites(prev => [newFav, ...prev]);
        toast.success('Added to favorites');
      }
    }
  };

  const isStyleFavorited = (styleId: ArtStyle) => !!isFavorited(favorites, styleId);
  const isMixStyleFavorited = (mix: StyleMix) => !!isMixFavorited(favorites, mix);

  return {
    favorites,
    isAuthenticated,
    toggleFavorite,
    toggleMixFavorite,
    isStyleFavorited,
    isMixStyleFavorited,
  };
}
