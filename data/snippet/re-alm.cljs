(defn init-counter []
  0)

(defn render-counter [model dispatch]
  [:div (str model)
    [:button {:on-click #(dispatch :inc)} "increment"]
    [:button {:on-click #(dispatch :dec)} "decrement"]])

(defn update-counter [model msg]
  (match msg
         :inc
         (inc model)

         :dec
         (dec model)

         _
         model))

(boot
  (.getElementById js/document "app")
  {:update #'update-counter
   :render #'render-counter}
  (init-counter))
