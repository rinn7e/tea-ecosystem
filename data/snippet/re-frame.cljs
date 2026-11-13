(ns simple.core
  (:require [reagent.dom.client :as rdc]
            [re-frame.core :as rf]))

(rf/reg-event-db              ;; sets up initial application state
 :initialize                 ;; usage:  (dispatch [:initialize])
 (fn [_ _]                   ;; the two parameters are not important here, so use _
   {:time (js/Date.)         ;; What it returns becomes the new application state
    :time-color "orange"}))  ;; so the application state will initially be a map with two keys

(rf/reg-event-db                 ;; usage:  (dispatch [:timer a-js-Date])
 :timer                         ;; every second an event of this kind will be dispatched
 (fn [db [_ new-time]]          ;; note how the 2nd parameter is destructured to obtain the data value
   (assoc db :time new-time)))  ;; compute and return the new application state

(rf/reg-sub
 :time
 (fn [db _]     ;; db is current app state. 2nd unused param is query vector
   (:time db))) ;; return a query computation over the application state

(rf/reg-sub
 :time-color
 (fn [db _]
   (:time-color db)))

(defn clock
  []
  (let [colour @(rf/subscribe [:time-color])
        time   (-> @(rf/subscribe [:time])
                   .toTimeString
                   (clojure.string/split " ")
                   first)]
    [:div.example-clock {:style {:color colour}} time]))
